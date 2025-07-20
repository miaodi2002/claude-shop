export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Claude AWS Account Marketplace
        </h1>
        <p className="text-xl text-center text-gray-600 mb-12">
          Premium AWS accounts with Claude AI model quotas
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Browse Accounts</h2>
            <p className="text-gray-600 mb-4">
              Explore our curated selection of AWS accounts with pre-configured Claude AI quotas.
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              View Accounts
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Filter Options</h2>
            <p className="text-gray-600 mb-4">
              Find the perfect account based on Claude model types and quota levels.
            </p>
            <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              Filter Accounts
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Contact via Telegram</h2>
            <p className="text-gray-600 mb-4">
              Direct communication for purchases and account inquiries.
            </p>
            <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}