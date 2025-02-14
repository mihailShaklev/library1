const { GraphQLError } = require("graphql");
const jwt = require("jsonwebtoken");
const { PubSub } = require("graphql-subscriptions");
const pubsub = new PubSub();

const Author = require("./models/author");
const Book = require("./models/book");
const User = require("./models/user");

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: async () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      if (args.genre) {
        return Book.find({ genres: args.genre });
      }

      return Book.find({}).populate("author");
    },
    allAuthors: async () => {
      return Author.find();
    },
    me: (root, args, context) => {
      return context.currentUser;
    },
    recommended: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("Not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      return Book.find({ genres: currentUser.genre[0] }).populate("author");
    },
    booksByGenre: async (root, args) => {
      const genre = args.genre;
      if (genre === "all") {
        return Book.find({}).populate("author");
      }

      return Book.find({ genres: genre }).populate("author");
    },
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("Not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const author = await Author.findOneAndUpdate(
        { name: args.author },
        { $inc: { bookCount: 1 } },
        { returnOriginal: false, upsert: true }
      );

      try {
        await author.save();
      } catch (error) {
        throw new GraphQLError("Saving author failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.author,
            error,
          },
        });
      }

      const book = new Book({ ...args, author: author });

      try {
        await book.save();
      } catch (error) {
        throw new GraphQLError("Saving book failed", {
          extensions: {
            code: "BAD_BOOK_INPUT",
            invalidArgs: args.author,
            error,
          },
        });
      }

      pubsub.publish("BOOK_ADDED", { bookAdded: book });

      return book;
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError("Not authenticated", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const authorToEdit = await Author.findOneAndUpdate(
        { name: args.name },
        { $set: { born: args.setBornTo } },
        { returnOriginal: false }
      );

      return authorToEdit;
    },
    createUser: async (root, args) => {
      const user = new User({ username: args.username });
      return user.save().catch((error) => {
        throw new GraphQLError("User wasn`t saved!", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.username,
            error,
          },
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== "letmein") {
        throw new GraphQLError("Wrong credential", {
          extensions: {
            code: "BAD_USER_INPUT",
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    },
  },
  /*Author: {
    bookCount: (root) => {
      const books = Book.collection.countDocuments({ author: root._id });
      return books;
    },
  },*/
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator("BOOK_ADDED"),
    },
  },
};

module.exports = resolvers;
