import React, { useState, useEffect } from 'react'
import Select from 'react-select'
import { useLazyQuery } from '@apollo/client'

import { ALL_BOOKS } from '../queries'

const Books = ({ show, books }) => {
  const [selectedOption, setSelectedOption] = useState(null)
  const [filteredBooks, setFilteredBooks] = useState([])
  const [getFilteredBooks, resultFilteredBooks] = useLazyQuery(ALL_BOOKS)

  useEffect(() => {
    setFilteredBooks(books)
  }, [books])

  useEffect(() => {
    getFilteredBooks({ variables: { genre: selectedOption?.value } })
  }, [selectedOption, getFilteredBooks])

  useEffect(() => {
    if (resultFilteredBooks.data) {
      setFilteredBooks(resultFilteredBooks.data.allBooks)
    }
  }, [resultFilteredBooks.data])

  if (!show || filteredBooks === []) {
    return null
  }

  const genres = books.map((book) => book.genres)
  const genresUnique = [...new Set(genres.flat())]
  const genresNames = genresUnique.map((genre) => {
    const option = {
      value: genre,
      label: genre,
    }
    return option
  })
  genresNames.unshift({ value: null, label: '--show all--' })

  return (
    <div>
      <h2>books</h2>
      <p>
        in genre <b>{selectedOption?.value}</b>
      </p>
      <div>
        <Select
          defaultValue={selectedOption}
          onChange={setSelectedOption}
          options={genresNames}
        />
      </div>
      <div>
        <table>
          <tbody>
            <tr>
              <th></th>
              <th>author</th>
              <th>published</th>
            </tr>
            {filteredBooks.map((book) => (
              <tr key={book.title}>
                <td>{book.title}</td>
                <td>{book.author.name}</td>
                <td>{book.published}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Books
