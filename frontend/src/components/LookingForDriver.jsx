import React from 'react'
import VehicleIcon from './VehicleIcon'
import TripDetails from './TripDetails'

const LookingForDriver = (props) => {
    const handleClose = () => {
        if (props.cancelRide && props.canCancel) {
            props.cancelRide()
        } else if (props.setVehicleFound) {
            props.setVehicleFound(false)
        }
    }

    return (
        <div className='flex flex-col'>
            {/* Top Drag Handle / Close Button (Generous touch & click target) */}
            <div
                className='w-full py-3 -mt-2 -mb-1 flex items-center justify-center cursor-pointer group select-none'
                onClick={handleClose}
                title='Cancel driver search'
                role='button'
                aria-label='Cancel driver search'
            >
                <div className='w-12 h-1.5 bg-neutral-300 group-hover:bg-neutral-500 rounded-full transition-colors' />
            </div>

            <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xl font-bold tracking-tight text-neutral-900'>Looking for a Driver</h3>
                <span className='flex h-2.5 w-2.5 relative'>
                    <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                    <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500'></span>
                </span>
            </div>

            <div className='flex gap-3 justify-between flex-col items-center'>
                <div className='py-2'>
                    <VehicleIcon type={props.vehicleType} className='h-20 w-28 text-5xl animate-pulse' />
                </div>

                <div className='w-full'>
                    <TripDetails pickup={props.pickup} destination={props.destination} fare={props.fare} />
                </div>

                <button
                    disabled={!props.canCancel}
                    onClick={props.cancelRide}
                    className='w-full mt-2 bg-neutral-100 hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-50 text-neutral-800 font-semibold py-3 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2'>
                    <i className='ri-close-circle-line text-lg'></i>
                    <span>Cancel Ride Search</span>
                </button>
            </div>
        </div>
    )
}

export default LookingForDriver
