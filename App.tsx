import React, { useState, createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, Parcel } from './types';
import { DataProvider, useData } from './context/DataContext';
import AdminDashboard from './components/admin/AdminDashboard';
import BrandDashboard from './components/client/ClientDashboard';
import DriverApp from './components/driver/DriverApp';
import TeamDashboard from './components/team/TeamDashboard';
import LoginScreen from './components/LoginScreen';
import CustomerDashboard from './components/customer/CustomerDashboard';
import { supabase } from './supabase';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';

// Case conversion helpers to map between JS camelCase and Postgres snake_case
const toCamel = (s: string): string => s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
const isObject = (obj: any): boolean => obj === Object(obj) && !Array.isArray(obj) && typeof obj !== 'function';
const keysToCamel = (obj: any): any => {
  if (isObject(obj)) {
    const n: { [key: string]: any } = {};
    Object.keys(obj).forEach((k) => { n[toCamel(k)] = keysToCamel(obj[k]); });
    return n;
  } else if (Array.isArray(obj)) {
    return obj.map((i) => keysToCamel(i));
  }
  return obj;
};

type Theme = 'light' | 'dark';
type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const storedTheme = window.localStorage.getItem('send_theme');
            if (storedTheme) return storedTheme as Theme;
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('send_theme', theme);
    }, [theme]);
    
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

const AppContent: React.FC = () => {
    const { clearData, fetchData } = useData();
    const [checkingStatus, setCheckingStatus] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [customerSession, setCustomerSession] = useState<{ user: User; parcel: Parcel } | null>(null);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setAuthError(null);
            if (session?.user) {
                await fetchData();
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (error || !profile) {
                    console.error("Profile fetch error:", error);
                    setAuthError("Your account is valid, but we couldn't load your user profile. Please contact support.");
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                } else {
                    const userProfile = keysToCamel(profile) as User;
                    // Ensure role is always uppercase for consistent checks
                    userProfile.role = userProfile.role ? (userProfile.role.toUpperCase() as UserRole) : UserRole.CUSTOMER;
                    setCurrentUser(userProfile);
                }
            } else {
                setCurrentUser(null);
                clearData();
            }
            setCheckingStatus(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchData, clearData]);

    const handleCustomerLogin = (user: User, parcel: Parcel) => {
        setCustomerSession({ user, parcel });
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error);
        setCurrentUser(null);
        setCustomerSession(null);
        clearData();
    };
    
    const renderContent = () => {
        if (checkingStatus) {
            return (
                <div className="flex flex-col justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-lg text-content-secondary">Checking Session...</p>
                </div>
            );
        }

        if (customerSession) {
            return <CustomerDashboard user={customerSession.user} parcel={customerSession.parcel} onLogout={handleLogout} />;
        }

        if (!currentUser) {
            return <LoginScreen onCustomerLogin={handleCustomerLogin} authError={authError} clearAuthError={() => setAuthError(null)} />;
        }

        switch (currentUser.role) {
            case UserRole.ADMIN:
            case UserRole.WAREHOUSE_MANAGER:
                return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
            case UserRole.BRAND:
                return <BrandDashboard user={currentUser} onLogout={handleLogout} />;
            case UserRole.DRIVER:
                return <DriverApp user={currentUser} onLogout={handleLogout} />;
            case UserRole.SALES_MANAGER:
            case UserRole.DIRECT_SALES:
                 return <TeamDashboard user={currentUser} onLogout={handleLogout} />;
            default:
                 return <LoginScreen onCustomerLogin={handleCustomerLogin} authError="Invalid user role." clearAuthError={() => setAuthError(null)} />;
        }
    };

    return (
        <>
           <style>
            {`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 1cm;
                }
                body * {
                  visibility: hidden;
                }
                .printable-area, .printable-area * {
                  visibility: visible;
                }
                .printable-area {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  color: #000;
                }
                /* General Print Typography & Tables */
                .printable-area table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 24px;
                    font-size: 10pt;
                }
                .printable-area th, .printable-area td {
                    border: 1px solid #999;
                    padding: 6px;
                    text-align: left;
                }
                .printable-area thead th {
                    background-color: #eee;
                    font-weight: bold;
                }
                .printable-area .text-right {
                    text-align: right;
                }
                .printable-area .font-bold {
                    font-weight: bold;
                }
                /* Salary Report Specific Styles */
                .printable-area .sub-row > td {
                    padding-left: 24px;
                    border: none;
                    font-size: 9pt;
                    color: #333;
                }
                 .printable-area .total-row > td {
                    font-weight: bold;
                    border-top: 2px solid #000;
                    background-color: #f9f9f9;
                 }
                /* Styles for joint AWB printing */
                .joint-awb-container {
                  display: block; /* Override flex */
                }
                .single-awb-wrapper {
                  height: auto; /* Override height to let content size it */
                  width: 100%;
                  page-break-inside: avoid;
                  padding: 0; /* Remove padding which can cause overflow */
                  margin-bottom: 0.05cm; /* Add tiny spacing between AWBs */
                }
                .awb-print-size {
                  box-sizing: border-box; /* Ensure padding is included in dimensions */
                  height: 9.5cm; /* Explicit height for print */
                  width: 19cm; /* Explicit width for print */
                  margin: 0 auto; /* Center horizontally on the page */
                  /* Override inline/tailwind styles for print */
                  aspect-ratio: auto !important;
                  max-width: none !important;
                }
                .no-print {
                  display: none !important;
                }
                /* Styles for multi-page invoices */
                thead {
                    display: table-header-group;
                }
                tbody tr, tfoot {
                    page-break-inside: avoid;
                }
              }
            `}
          </style>
          <div className="min-h-screen bg-background text-content-primary">
            {renderContent()}
          </div>
        </>
    );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;