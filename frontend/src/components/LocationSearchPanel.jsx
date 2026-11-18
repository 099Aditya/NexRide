import React from 'react'

const LocationSearchPanel = ({
    suggestions = [],
    setPanelOpen,
    activeField,
    onSelectLocation,
    loading = false
}) => {

    const handleSuggestionClick = (suggestion) => {
        if (onSelectLocation) {
            onSelectLocation(suggestion, activeField)
        }
    }

    return (
        <div className='pb-4 space-y-1'>
            {loading && (
                <div className='flex items-center gap-2 p-3 text-sm text-gray-500'>
                    <i className='ri-loader-4-line animate-spin text-lg'></i>
                    <span>Searching locations...</span>
                </div>
            )}

            {!loading && suggestions.length === 0 && (
                <div className='p-4 text-center text-gray-500 text-sm'>
                    <i className='ri-map-pin-line text-2xl mb-1 block text-gray-400'></i>
                    <span>Type at least 3 characters (e.g., <strong>Delhi Gate</strong> or <strong>Connaught Place</strong>) to see live address suggestions.</span>
                </div>
            )}

            {suggestions.map((elem, idx) => {
                const parts = elem.split(',')
                const title = parts[ 0 ]?.trim() || elem
                const subtitle = parts.slice(1).join(',')?.trim()

                return (
                    <div
                        key={idx}
                        onClick={() => handleSuggestionClick(elem)}
                        className='flex gap-3.5 border border-neutral-100 hover:border-amber-400 p-3 hover:bg-amber-50/60 active:bg-amber-100/80 rounded-xl items-center cursor-pointer transition-all shadow-xs'
                    >
                        <span className='bg-yellow-400 text-black h-9 w-9 min-w-9 flex items-center justify-center rounded-xl shadow-xs'>
                            <i className="ri-map-pin-2-fill text-base"></i>
                        </span>
                        <div className='flex flex-col text-left overflow-hidden min-w-0'>
                            <h4 className='font-bold text-neutral-900 text-sm truncate'>{title}</h4>
                            {subtitle && (
                                <p className='text-xs text-neutral-500 truncate'>{subtitle}</p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default LocationSearchPanel
