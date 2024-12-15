'use client'

import * as React from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
Sheet,
SheetContent,
SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import router from 'next/router'

const menuItems = [
{ name: 'User Profile', href: '/profile' },
{ name: 'Search', href: '/search' },
{ name: "Simple Queries", href: '/simple'},
{ name: 'Complex Queries', href: '/complex' },
]

const inter = Inter({ subsets: ['latin'] })

export function Menubar() {
const [isOpen, setIsOpen] = React.useState(false)

return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 shadow-md">
    <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
        <div className="flex-shrink-0">
            <a href="/" className={`text-2xl font-bold text-gray-800 dark:text-gray-100 ${inter.className}`}>
                Stockify
            </a>
        </div>
        <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
            {menuItems.map((item) => (
                <a
                key={item.name}
                href={item.href}
                className="text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
                >
                {item.name}
                </a>
            ))}
            </div>
        </div>
        <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                <div className="flex flex-col space-y-4 mt-4">
                {menuItems.map((item) => (
                    <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
                    onClick={() => setIsOpen(false)}
                    >
                    {item.name}
                    </a>
                ))}
                </div>
            </SheetContent>
            </Sheet>
        </div>
        </div>
    </div>
    </div>
)
}