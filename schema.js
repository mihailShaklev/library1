const typeDefs = `
  type User {
    username: String!
    genre: [String]
    id: ID!
  }

  type Token {
    value: String!
  }

  type Author {
    name: String
    born: Int
    bookCount: Int
  }

  type Book {
    id: ID!
    title: String 
    author: Author
    published: Int
    genres: [String!]!
  }

  type Query {
    bookCount: Int
    authorCount: Int
    allBooks(author: String, genre: String): [Book!]
    allAuthors: [Author]
    me:User
    recommended: [Book!]!
    booksByGenre(genre: String!): [Book!]!
  }
  type Mutation {
    addBook(
        title: String!
        author: String!
        published: Int!
        genres: [String!]!
    ):Book!
    editAuthor(
        name: String
        setBornTo: Int
    ):Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
  type Subscription {
    bookAdded: Book!
  }
`;

module.exports = typeDefs;
