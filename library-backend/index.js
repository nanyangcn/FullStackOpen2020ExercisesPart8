const {
  PubSub,
  ApolloServer,
  UserInputError,
  AuthenticationError,
  gql,
} = require('apollo-server');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Author = require('./models/author');
const Book = require('./models/book');
const User = require('./models/user');

const pubsub = new PubSub();

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.SECRET;

console.log('connecting to MongoDB');

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => {
    console.log('connected to MongoDB');
  })
  .catch((error) => {
    console.error('error connection to MongoDB:', error.message);
  });

const typeDefs = gql`
  type Author {
    name: String!
    born: Int
    id: ID!
    bookCount: Int
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
    createUser(username: String!, favoriteGenre: String!): User
    login(username: String!, password: String!): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`;

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      const books = await Book.find({}).populate('author');
      let booksFiltered = [...books];
      if (args.author) {
        booksFiltered = booksFiltered.filter(
          (book) => book.author.name === args.author
        );
      }
      if (args.genre) {
        booksFiltered = booksFiltered.filter((book) =>
          book.genres.includes(args.genre)
        );
      }
      return booksFiltered;
    },
    allAuthors: async () => {
      const authors = await Author.find({});
      return authors;
    },
    me: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }
      const user = await User.findOne({ username: currentUser.username });
      return user;
    },
  },
  Mutation: {
    addBook: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }

      let author = await Author.findOne({ name: args.author });
      if (!author) {
        author = new Author({ name: args.author, bookCount: 1 });
      } else {
        author.bookCount += 1;
      }

      const newBook = new Book({ ...args, author: author._id });
      try {
        await newBook.save();
        await author.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
      newBook.author = author;

      pubsub.publish('BOOK_ADDED', { bookAdded: newBook });

      return newBook;
    },
    editAuthor: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError('not authenticated');
      }

      const editedAuthor = await Author.findOne({ name: args.name });
      if (!editedAuthor) {
        return null;
      }
      editedAuthor.born = args.setBornTo;
      editedAuthor.save();
      return editedAuthor;
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });

      try {
        await user.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }

      return user;
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== 'password') {
        throw new UserInputError('wrong credentials');
      }
      const userForToken = {
        username: user.username,
        id: user._id,
      };
      return { value: jwt.sign(userForToken, JWT_SECRET) };
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req?.headers?.authorization;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
    return null;
  },
});

const PORT = 4000;
server.listen(process.env.PORT || PORT).then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`);
  console.log(`Subscriptions ready at ${subscriptionsUrl}`);
});
