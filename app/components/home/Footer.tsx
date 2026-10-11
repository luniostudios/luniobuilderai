import React from 'react'

const Footer = () => {
    return (
        <div className='flex flex-row justify-between px-[10%] max-lg:px-10 items-center gap-5 max-md:flex-col bg-[#111114] py-5 bottom-5 max-lg:mt-10 right-4 w-full text-center text-gray-500 text-xs'>
            <h2>All Rights Reserved. Made with ❤️ by <a href="https://www.luniostudios.com/" target="_blank" rel="noopener noreferrer" className='text-gray-400 hover:text-gray-300 transition-colors underline'>LUNIO Studios</a></h2>
            <ul className='flex flex-row gap-5'>
                <li><a href="/legal/terms" className='text-gray-400 hover:text-gray-300 transition-colors underline'>Terms of Service</a></li>
                <li><a href="/legal/privacy" className='text-gray-400 hover:text-gray-300 transition-colors underline'>Privacy Policy</a></li>
                <li><a href="/legal/usage" className='text-gray-400 hover:text-gray-300 transition-colors underline'>Usage Policy</a></li>
            </ul>
        </div>
    )
}

export default Footer