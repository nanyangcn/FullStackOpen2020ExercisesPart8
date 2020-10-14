const { ApolloServer, gql } = require('apollo-server')
const fp = require('lodash/fp')
const { v1: uuid } = require('uuid')

let authors = [
  {
    name: 'Robert Martin',
    id: 'afa51ab0-344d-11e9-a414-719c6709cf3e',
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: 'afa5b6f0-344d-11e9-a414-719c6709cf3e',
    born: 1963,
  },
  {
    name: 'Fyodor Dostoevsky',
    id: 'afa5b6f1-344d-11e9-a414-719c6709cf3e',
    born: 1821,
  },
  {
    name: 'Joshua Kerievsky', // birth year not known
    id: 'afa5b6f2-344d-11e9-a414-719c6709cf3e',
  },
  {
    name: 'Sandi Metz', // birth year not known
    id: 'afa5b6f3-344d-11e9-a414-719c6709cf3e',
  },
]

/*
 * It might make more sense to associate a book with its author by storing the author's id instead of the author's name
 * For simplicity, however, we will store the author's name in the context of the book.
 */

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: 'afa5b6f4-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring'],
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: 'afa5b6f5-344d-11e9-a414-719c6709cf3e',
    genres: ['agile', 'patterns', 'design'],
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: 'afa5de00-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring'],
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: 'afa5de01-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring', 'patterns'],
  },
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: 'afa5de02-344d-11e9-a414-719c6709cf3e',
    genres: ['refactoring', 'design'],
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: 'afa5de03-344d-11e9-a414-719c6709cf3e',
    genres: ['classic', 'crime'],
  },
  {
    title: 'The Demon ',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: 'afa5de04-344d-11e9-a414-719c6709cf3e',
    genres: ['classic', 'revolution'],
  },
]

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
    author: String!
    genres: [String!]!
    id: ID!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
  }
`

const resolvers = {
  Query: {
    bookCount: () => books.length,
    authorCount: () => authors.length,
    allBooks: (root, args) => {
      let booksFiltered = [...books]
      if (args.author) {
        booksFiltered = booksFiltered.filter(
          (book) => book.author === args.author
        )
      }
      if (args.genre) {
        booksFiltered = booksFiltered.filter((book) =>
          book.genres.includes(args.genre)
        )
      }
      return booksFiltered
    },
    allAuthors: () => {
      const authorsAndCounts = fp.countBy('author')(books)
      const bookCount = Object.values(authorsAndCounts)
      let authorsWithBookCount = [...authors]
      return authorsWithBookCount.map((author, i) => {
        return Object.defineProperty(author, 'bookCount', {
          value: bookCount[i],
        })
      })
    },
  },
  Mutation: {
    addBook: (root, args) => {
      const newBook = { ...args, id: uuid() }
      books = [...books, newBook]

      if (!authors.find((author) => author.name === args.author)) {
        const author = {
          name: args.author, // birth year not known
          id: uuid(),
        }
        authors = [...authors, author]
      }
      return newBook
    },
    editAuthor: (root, args) => {
      const editedAuthor = authors.find((author) => author.name === args.name)
      if (!editedAuthor) {
        return null
      }
      editedAuthor.born = args.setBornTo
      return editedAuthor
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
