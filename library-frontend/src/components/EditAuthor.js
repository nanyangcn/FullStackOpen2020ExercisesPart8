import React, { useState } from 'react'
import Select from 'react-select'
import { useMutation } from '@apollo/client'

import { EDIT_AUTHOR } from '../queries'

const EditAuthor = ({ authors }) => {
  const [birthYear, setBirthYear] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [editAuthor] = useMutation(EDIT_AUTHOR, {
    onError: (error) => {
      console.log(error.graphQLErrors[0].message)
    },
  })

  const handleSubmit = (event) => {
    event.preventDefault()

    const editedAuthor = {
      name: selectedOption.value,
      setBornTo: Number(birthYear),
    }

    editAuthor({ variables: editedAuthor })

    setBirthYear('')
    setSelectedOption(null)
  }
  const authorsNames = authors.map((author) => {
    const option = {
      value: author.name,
      label: author.name,
    }
    return option
  })

  return (
    <div>
      <h3>Set birth year</h3>
      <Select
        defaultValue={selectedOption}
        onChange={setSelectedOption}
        options={authorsNames}
      />
      <form onSubmit={handleSubmit}>
        born
        <input
          type='number'
          value={birthYear}
          onChange={({ target }) => setBirthYear(target.value)}
        />
        <div>
          <button type='submit'>update author</button>
        </div>
      </form>
    </div>
  )
}

export default EditAuthor
