import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold">
            ⚓ Anchor
          </Link>
          <nav className="flex gap-6">
            <Link to="/" className="hover:text-blue-200 transition">
              My Tasks
            </Link>
            <Link to="/admin" className="hover:text-blue-200 transition">
              Admin
            </Link>
            <Link to="/profile" className="hover:text-blue-200 transition">
              Profile
            </Link>
            <Link to="/login" className="hover:text-blue-200 transition">
              Login
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
