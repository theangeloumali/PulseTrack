import logo from '../assets/logo.png';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img 
              src={logo} 
              alt="PulseTrack" 
              className="h-8 w-auto"
            />
            <span className="ml-3 text-xl font-bold text-gray-900">PulseTrack</span>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-700 hover:text-primary-600 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-gray-700 hover:text-primary-600 transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-gray-700 hover:text-primary-600 transition-colors">
              Testimonials
            </a>
            <a href="#contact" className="text-gray-700 hover:text-primary-600 transition-colors">
              Contact
            </a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <a 
              href="https://pulsetrack-zkidz-web.vercel.app/pulse/login" 
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              Sign In
            </a>
            <a 
              href="https://pulsetrack-zkidz-web.vercel.app/pulse/signup"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;