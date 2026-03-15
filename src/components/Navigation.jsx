import { Link } from 'react-router-dom'

function Navigation() {
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-teal-600 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-blue-100 transition">
          MarineHR
        </Link>
        <div className="space-x-6">
          <Link to="/" className="hover:text-blue-100 transition font-medium">
            Home
          </Link>
          <Link to="/admin" className="hover:text-blue-100 transition font-medium">
            Admin Panel
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
