import React, { useState, useEffect } from 'react'
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import LoginForm from './components/LoginForm'
import Recommendation from './components/Recommendation'

import { useMutation, useLazyQuery, useApolloClient } from '@apollo/client'

import { LOGIN, CREATE_BOOK, ALL_BOOKS, ALL_AUTHORS, ME } from './queries'

const App = () => {
  const [page, setPage] = useState('authors')
  const [token, setToken] = useState(null)
  const [authors, setAuthors] = useState([])
  const [books, setBooks] = useState([])
  const [favoriteBooks, setFavoriteBooks] = useState([])
  const [loggedUser, setLoggedUser] = useState(null)

  const client = useApolloClient()
  const [getAuthors, resultAuthors] = useLazyQuery(ALL_AUTHORS)
  const [getBooks, resultBooks] = useLazyQuery(ALL_BOOKS)
  const [getFavoriteBooks, resultFavoriteBooks] = useLazyQuery(ALL_BOOKS)
  const [getLoggedUser, resultLoggedUser] = useLazyQuery(ME, {
    onError: (error) => {
      console.log(error)
    },
  })

  const [login] = useMutation(LOGIN)
  const [createBook] = useMutation(CREATE_BOOK, {
    update: (store, response) => {
      const allAuthors = store.readQuery({ query: ALL_AUTHORS }).allAuthors
      const authorsInStore = {
        allAuthors: allAuthors.map((author) => ({ ...author })),
      }
      const author = authorsInStore.allAuthors.find(
        (author) => author.name === response.data.addBook.author.name
      )
      if (author) {
        author.bookCount += 1
      } else {
        authorsInStore.allAuthors = [
          ...authorsInStore.allAuthors,
          response.data.addBook.author,
        ]
      }
      store.writeQuery({
        query: ALL_AUTHORS,
        data: authorsInStore,
      })

      const booksInStore = store.readQuery({ query: ALL_BOOKS })
      store.writeQuery({
        query: ALL_BOOKS,
        data: {
          ...booksInStore,
          allBooks: [...booksInStore.allBooks, response.data.addBook],
        },
      })
    },
    onError: (error) => {
      console.log(error)
    },
  })

  useEffect(() => {
    getAuthors()
    getBooks()
    const token = localStorage.getItem('token')
    if (token) {
      setToken(token)
      getLoggedUser()
    }
  }, [getAuthors, getBooks, getLoggedUser])

  useEffect(() => {
    if (resultLoggedUser.data) {
      setLoggedUser(resultLoggedUser.data.me)
    }
  }, [resultLoggedUser.data])

  useEffect(() => {
    if (resultAuthors.data) {
      setAuthors(resultAuthors.data.allAuthors)
    }
  }, [resultAuthors.data])

  useEffect(() => {
    if (resultBooks.data) {
      setBooks(resultBooks.data.allBooks)
    }
  }, [resultBooks.data])

  useEffect(() => {
    if (resultFavoriteBooks.data) {
      setFavoriteBooks(resultFavoriteBooks.data.allBooks)
    }
  }, [resultFavoriteBooks.data])

  const loginDisplay = {
    display: token ? 'none' : '',
  }
  const logoutDisplay = {
    display: token ? '' : 'none',
  }

  const handleNewBook = (newBook) => {
    createBook({ variables: newBook })
  }

  const handleLogin = async (username, password) => {
    try {
      const user = await login({ variables: { username, password } })
      localStorage.setItem('token', user.data.login.value)
      setToken(user.data.login.value)
      setPage('add')
    } catch (err) {
      console.log(err.message)
    }
  }

  const handleLogout = () => {
    client.resetStore()
    setPage('login')
    localStorage.clear()
    setToken(null)
  }

  const handleRecommend = () => {
    setPage('recommend')
    getFavoriteBooks({ variables: { genre: loggedUser.favoriteGenre } })
  }

  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button onClick={() => setPage('books')}>books</button>
        <button style={loginDisplay} onClick={() => setPage('login')}>
          login
        </button>
        <button style={logoutDisplay} onClick={() => setPage('add')}>
          add book
        </button>
        <button style={logoutDisplay} onClick={handleRecommend}>
          recommend
        </button>
        <button style={logoutDisplay} onClick={handleLogout}>
          logout
        </button>
      </div>

      <Authors show={page === 'authors'} authors={authors} />
      <Books show={page === 'books'} books={books} getBooks={getBooks} />
      <NewBook show={page === 'add'} handleNewBook={handleNewBook} />
      <LoginForm show={page === 'login'} handleLogin={handleLogin} />
      <Recommendation
        show={page === 'recommend'}
        favoriteGenre={loggedUser?.favoriteGenre}
        favoriteBooks={favoriteBooks}
      />
    </div>
  )
}

export default App
