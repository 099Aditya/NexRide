import React, { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { UserDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Logo from '../components/Logo'
import { BASE_URL, apiError, setToken } from '../utils/api'

const UserLogin = () => {
  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')
  const [ error, setError ] = useState('')
  const [ devBypassing, setDevBypassing ] = useState(false)

  const { user, setUser } = useContext(UserDataContext)
  const navigate = useNavigate()

  const handleDevBypass = async () => {
    setDevBypassing(true)
    const mockUser = {
      _id: '660000000000000000000001',
      fullname: { firstname: 'Dev', lastname: 'Tester' },
      email: 'dev@veloxride.local'
    }

    try {
      const response = await axios.post(`${BASE_URL}/users/dev-login`)
      if (response?.data?.token && response?.data?.user) {
        setUser(response.data.user)
        setToken('user', response.data.token)
        navigate('/home')
        return
      }
    } catch {
      // Graceful client-side mock session fallback
    }

    setUser(mockUser)
    setToken('user', 'dev-bypass-token')
    navigate('/home')
  }

  const submitHandler = async (e) => {
    e.preventDefault();

    const userData = {
      email: email,
      password: password
    }

    setError('')
    try {
      const response = await axios.post(`${BASE_URL}/users/login`, userData)
      setUser(response.data.user)
      setToken('user', response.data.token)
      navigate('/home')
    } catch (err) {
      setError(apiError(err, 'Login failed. Please try again.'))
      return
    }



    setEmail('')
    setPassword('')
  }

  return (
    <div className='p-7 h-screen flex flex-col justify-between'>
      <div>
        <div className='flex items-center justify-between mb-8'>
          <Logo />
          <button
            type='button'
            onClick={handleDevBypass}
            disabled={devBypassing}
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs transition-all active:scale-95 group'
            title='Dev Bypass · Skip Login for Testing'
          >
            <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
            <span>{devBypassing ? 'Entering...' : 'Quick Enter'}</span>
            <i className='ri-arrow-right-line text-sm text-emerald-700 group-hover:translate-x-0.5 transition-transform'></i>
          </button>
        </div>

        <form onSubmit={(e) => {
          submitHandler(e)
        }}>
          <h3 className='text-lg font-medium mb-2'>What's your email</h3>
          <input
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type="email"
            placeholder='email@example.com'
          />

          <h3 className='text-lg font-medium mb-2'>Enter Password</h3>

          <input
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
            required type="password"
            placeholder='password'
          />

          {error && <p className='mb-3 text-sm text-red-600'>{error}</p>}

          <button
            className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
          >Login</button>

          {/* Dev Skip / Quick Enter Arrow Button */}
          <button
            type='button'
            onClick={handleDevBypass}
            disabled={devBypassing}
            className='w-full py-2.5 px-4 mb-4 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] group shadow-2xs'
          >
            <i className='ri-flashlight-fill text-amber-500 text-base'></i>
            <span>{devBypassing ? 'Entering Dev Mode...' : 'Dev Bypass · Quick Enter'}</span>
            <i className='ri-arrow-right-line text-sm group-hover:translate-x-1 transition-transform'></i>
          </button>

        </form>
        <p className='text-center'>New here? <Link to='/signup' className='text-blue-600'>Create new Account</Link></p>
      </div>
      <div>
        <Link
          to='/captain-login'
          className='bg-[#10b461] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
        >Sign in as Captain</Link>
      </div>
    </div>
  )
}

export default UserLogin