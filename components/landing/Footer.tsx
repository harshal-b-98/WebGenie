export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-white">NextGenWeb</h3>
            <p className="mt-2 text-sm text-gray-400">
              AI-powered website builder that transforms conversations into beautiful websites.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Product</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#features" className="text-sm text-gray-400 hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white">
                  How It Works
                </a>
              </li>
              <li>
                <a href="/signup" className="text-sm text-gray-400 hover:text-white">
                  Get Started
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Legal</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; {currentYear} NextGenWeb. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
