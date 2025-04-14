import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-dark text-white py-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">InfluConnect</h3>
            <p className="text-gray-400 mb-4">Connect directly with your favorite influencers through chats, calls, and video conferences.</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <i className="ri-facebook-fill text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <i className="ri-twitter-fill text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <i className="ri-instagram-fill text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <i className="ri-linkedin-fill text-xl"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/">
                  <span className="text-gray-400 hover:text-white transition cursor-pointer">Home</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard">
                  <span className="text-gray-400 hover:text-white transition cursor-pointer">Browse Influencers</span>
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="text-gray-400 hover:text-white transition">How It Works</a>
              </li>
              <li>
                <Link href="/wallet">
                  <span className="text-gray-400 hover:text-white transition cursor-pointer">Pricing</span>
                </Link>
              </li>
              <li>
                <a href="#faq" className="text-gray-400 hover:text-white transition">FAQ</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Refund Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Cookie Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Content Guidelines</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Contact Us</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <i className="ri-mail-line mr-2 mt-1"></i>
                <span className="text-gray-400">support@influconnect.com</span>
              </li>
              <li className="flex items-start">
                <i className="ri-phone-line mr-2 mt-1"></i>
                <span className="text-gray-400">+91 9876543210</span>
              </li>
              <li className="flex items-start">
                <i className="ri-map-pin-line mr-2 mt-1"></i>
                <span className="text-gray-400">123 Tech Park, Bangalore, India</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} InfluConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
