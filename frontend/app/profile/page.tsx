'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUserProfile, getSavedCompanies, removeCompany, addCompany, getAvailableCompanies, logout } from '@/utils/api'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { CompanyDetails } from '@/components/ui/CompanyDetails'
import { useSession } from 'next-auth/react'

interface UserProfile {
  id: number;
  username: string;
  email: string;
  provider: string | null;
}

interface SavedCompany {
  cik: string;
  year: number;
  month: number;
  cash_and_equivalents: number;
  long_term_debt: number;
  companyname: string;
  ticker: string;
}

interface AvailableCompany {
  ticker: string;
  cik: string;
  companyname: string;
}

export default function UserProfile() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [companies, setCompanies] = useState<SavedCompany[]>([])
  const [availableCompanies, setAvailableCompanies] = useState<AvailableCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<{ name: string; cik: string; ticker?: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Status:', status);
        console.log('Full session:', session);
        console.log('Backend token:', session?.backendToken);

        if (status === 'loading') {
          console.log('Session is loading...');
          return;
        }

        if (status === 'unauthenticated') {
          console.log('User is not authenticated, redirecting to login');
          router.push('/login');
          return;
        }

        if (!session?.backendToken) {
          console.error('No backend token in session');
          throw new Error('Authentication token not found');
        }

        const [profileData, companiesData, availableCompaniesData] = await Promise.all([
          getUserProfile(),
          getSavedCompanies(),
          getAvailableCompanies()
        ]);

        console.log('Companies data:', companiesData);
        
        setProfile(profileData);
        setCompanies(companiesData);
        setAvailableCompanies(availableCompaniesData);
      } catch (err: any) {
        console.error('Error in profile page:', err);
        setError(err.message);
        if (err.message.includes('authentication') || err.response?.status === 401) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status, router]);

  const handleAddCompany = async (cik: string) => {
    try {
      await addCompany([cik])
      const updatedCompanies = await getSavedCompanies()
      setCompanies(updatedCompanies)
      setIsAddingCompany(false)
    } catch (err: any) {
      console.error('Error adding company:', err)
      setError(err.response?.data?.detail || 'Failed to add company')
    }
  }

  const handleRemoveCompany = async (cik: string) => {
    try {
      await removeCompany(cik)
      setCompanies(companies.filter(company => company.cik !== cik))
    } catch (err: any) {
      console.error('Error removing company:', err)
      setError(err.response?.data?.detail || 'Failed to remove company')
    }
  }

  const handleViewDetails = (companyName: string, cik: string) => {
    const savedCompany = companies.find(c => c.cik === cik);
    
    const availableCompany = availableCompanies.find(c => c.cik === cik);
    
    console.log('View Details - Saved Company:', savedCompany);
    console.log('View Details - Available Company:', availableCompany);
    
    setSelectedCompany({ 
      name: companyName,
      cik: cik,
      ticker: savedCompany?.ticker || availableCompany?.ticker
    });
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredCompanies = availableCompanies.filter(company => 
    company.companyname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Profile</CardTitle>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </CardHeader>
        <CardContent>
          {profile && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage 
                    src={`https://api.dicebear.com/6.x/initials/svg?seed=${profile.username}`} 
                    alt={profile.username} 
                  />
                  <AvatarFallback>{profile.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{profile.username}</h2>
                  <p className="text-gray-500">{profile.email}</p>
                  {profile.provider && (
                    <p className="text-sm text-gray-400">
                      Signed in with {profile.provider}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Saved Companies</h3>
                  <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
                    <DialogTrigger asChild>
                      <Button>Add Company</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Company</DialogTitle>
                        <DialogDescription>
                          Search and select a company to add to your watchlist.
                        </DialogDescription>
                      </DialogHeader>
                      <Command>
                        <CommandInput 
                          placeholder="Search companies..."
                          value={searchTerm}
                          onValueChange={setSearchTerm}
                        />
                        <CommandList>
                          <CommandEmpty>No companies found.</CommandEmpty>
                          <CommandGroup>
                            {filteredCompanies.map((company) => (
                              <CommandItem
                                key={company.cik}
                                onSelect={() => handleAddCompany(company.cik)}
                              >
                                <div className="flex flex-col">
                                  <span>{company.companyname}</span>
                                  <span className="text-sm text-gray-500">
                                    {company.ticker} - CIK: {company.cik}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-3">
                  {companies.map((company) => (
                    <div 
                      key={company.cik} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-lg">{company.companyname}</p>
                        <p className="text-sm text-gray-500">
                          Last Updated: {company.month}/{company.year}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(company.companyname, company.cik)}
                        >
                          View Details
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleRemoveCompany(company.cik)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {companies.length === 0 && (
                    <p className="text-gray-500">No saved companies</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCompany && (
        <CompanyDetails
          companyName={selectedCompany.name}
          cik={selectedCompany.cik}
          ticker={selectedCompany.ticker}
          isOpen={!!selectedCompany}
          onClose={() => setSelectedCompany(null)}
        />
      )}
    </div>
  )
}

