import React from 'react'
import VehicleIcon from './VehicleIcon'
import TripDetails from './TripDetails'
import { VEHICLES, fullName } from '../utils/format'

const WaitingForDriver = (props) => {
  const captain = props.ride?.captain
  const vehicleType = captain?.vehicle?.vehicleType
  const rating = captain?.rating

  return (
    <div className='flex flex-col'>
      {/* Top Drag Handle (Generous touch & click target) */}
      <div
        className='w-full py-3 -mt-2 -mb-1 flex items-center justify-center cursor-pointer group select-none'
        onClick={() => props.setWaitingForDriver(false)}
        title='Minimize'
        role='button'
        aria-label='Minimize ride panel'
      >
        <div className='w-12 h-1.5 bg-neutral-300 group-hover:bg-neutral-500 rounded-full transition-colors' />
      </div>

      <div className='flex items-center justify-between pb-3 border-b border-neutral-100'>
        <div className='flex items-center gap-3'>
          <VehicleIcon type={vehicleType} className='text-3xl' />
          <div>
            <h2 className='text-base font-bold text-neutral-900 capitalize'>{fullName(captain) || 'Driver'}</h2>
            <p className='text-xs text-neutral-500 capitalize'>{captain?.vehicle?.color} · {VEHICLES[ vehicleType ]?.label}</p>
          </div>
        </div>
        <div className='text-right'>
          <h4 className='text-lg font-mono font-bold text-neutral-900 uppercase tracking-tight'>{captain?.vehicle?.plate}</h4>
          <p className='text-xs font-semibold text-neutral-600 flex items-center justify-end gap-1'>
            <i className='ri-star-fill text-amber-500 text-xs'></i>
            <span>{rating?.count ? rating.average.toFixed(1) : '5.0'}</span>
          </p>
        </div>
      </div>

      <div className='my-3 flex items-center justify-between bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5'>
        <div>
          <p className='text-xs font-bold text-amber-950 uppercase tracking-wider'>Ride PIN / OTP</p>
          <p className='text-xs text-amber-800 font-medium'>Share with captain to start</p>
        </div>
        <h1 className='text-2xl font-mono font-bold tracking-widest text-amber-950 bg-white px-3 py-1 rounded-xl shadow-xs border border-amber-200'>
          {props.ride?.otp}
        </h1>
      </div>

      <div className='w-full'>
        <TripDetails pickup={props.ride?.pickup} destination={props.ride?.destination} fare={props.ride?.fare} />
      </div>

      <button
        onClick={props.cancelRide}
        className='w-full mt-3 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.99] text-neutral-800 font-semibold py-3 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2'
      >
        <i className='ri-close-circle-line text-lg'></i>
        <span>Cancel Ride</span>
      </button>
    </div>
  )
}

export default WaitingForDriver
