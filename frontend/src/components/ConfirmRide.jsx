import React from 'react'
import VehicleIcon from './VehicleIcon'
import TripDetails from './TripDetails'
import { VEHICLES } from '../utils/format'

const ConfirmRide = (props) => {
    const handleBack = () => {
        props.setConfirmRidePanel(false)
        if (props.setVehiclePanel) {
            props.setVehiclePanel(true)
        }
    }

    return (
        <div className='flex flex-col'>
            {/* Top Drag Handle / Back (Generous touch & click target) */}
            <div
                className='w-full py-3 -mt-2 -mb-1 flex items-center justify-center cursor-pointer group select-none'
                onClick={handleBack}
                title='Back to transit options'
                role='button'
                aria-label='Back to transit options'
            >
                <div className='w-12 h-1.5 bg-neutral-300 group-hover:bg-neutral-500 rounded-full transition-colors' />
            </div>

            <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xl font-bold tracking-tight text-neutral-900'>Confirm Your Ride</h3>
                <span className='text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800'>
                    {VEHICLES[ props.vehicleType ]?.label || 'Cab'}
                </span>
            </div>

            <div className='flex gap-3 justify-between flex-col items-center'>
                <div className='py-2 flex flex-col items-center'>
                    <VehicleIcon type={props.vehicleType} className='h-20 w-28 text-5xl' />
                    <p className='font-bold text-neutral-900 text-base mt-1'>{VEHICLES[ props.vehicleType ]?.label}</p>
                </div>

                <div className='w-full'>
                    <TripDetails pickup={props.pickup} destination={props.destination} fare={props.fare[ props.vehicleType ]} />
                </div>

                <button
                    onClick={() => {
                        props.setVehicleFound(true)
                        props.setConfirmRidePanel(false)
                        props.createRide()
                    }}
                    className='w-full mt-3 bg-black hover:bg-neutral-900 active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2'
                >
                    <span>Request {VEHICLES[ props.vehicleType ]?.label || 'Ride'}</span>
                    <i className='ri-arrow-right-line text-lg'></i>
                </button>
            </div>
        </div>
    )
}

export default ConfirmRide
