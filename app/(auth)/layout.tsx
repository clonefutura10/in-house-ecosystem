import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div
            className={`${inter.variable} font-sans min-h-screen flex flex-col items-center justify-center bg-[#f6f7f8] dark:bg-[#101a22] transition-colors duration-300`}
        >
            {children}
        </div>
    )
}
