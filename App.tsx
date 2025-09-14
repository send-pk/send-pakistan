import React, { useState, createContext, useContext, useEffect, useMemo } from 'react';
import { User, UserRole, Parcel } from './types';
import { DataProvider, useData } from './context/DataContext';
import AdminDashboard from './components/admin/AdminDashboard';
import BrandDashboard from './components/client/ClientDashboard';
import DriverApp from './components/driver/DriverApp';
import LoginScreen from './components/LoginScreen';
import CustomerDashboard from './components/customer/CustomerDashboard';
import { supabase } from './supabase';

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

// Case conversion helpers for fetching user profile
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

const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeParcel, setActiveParcel] = useState<Parcel | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const { loading: isDataLoading } = useData();

  useEffect(() => {
    const fetchUserProfile = async (userId: string): Promise<User | null> => {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (error || !data) {
            console.error('Error fetching user profile:', error?.message);
            return null;
        }
        return keysToCamel(data) as User;
    };

    // Check for active session on initial load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
            const userProfile = await fetchUserProfile(session.user.id);
            setCurrentUser(userProfile);
        }
        setCheckingStatus(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            setActiveParcel(null);
        } else if (session) {
            const userProfile = await fetchUserProfile(session.user.id);
            setCurrentUser(userProfile);
            // If there's a session but no profile, they will be logged in but can't see anything.
            // This is better than logging them out, as their profile might be created shortly after.
            // The UI will handle the null currentUser state correctly.
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);


  const handleLogin = (user: User, parcel?: Parcel) => {
    setCurrentUser(user);
    if(parcel) {
        setActiveParcel(parcel);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveParcel(null);
  };

  const renderContent = () => {
    // Show loader while checking auth status OR while the main app data is loading.
    // This ensures dashboards have the data they need from DataContext before rendering.
    if (checkingStatus || isDataLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!currentUser) {
      return <LoginScreen onLogin={handleLogin} />;
    }

    switch (currentUser.role) {
      case UserRole.ADMIN:
      case UserRole.WAREHOUSE_MANAGER:
        return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
      case UserRole.BRAND:
        return <BrandDashboard user={currentUser} onLogout={handleLogout} />;
      case UserRole.DRIVER:
        return <DriverApp user={currentUser} onLogout={handleLogout} />;
      case UserRole.CUSTOMER:
        if (activeParcel) {
            return <CustomerDashboard user={currentUser} parcel={activeParcel} onLogout={handleLogout} />;
        }
        // Fallback if customer is logged in but parcel is missing
        return <LoginScreen onLogin={handleLogin} />;
      default:
        return <LoginScreen onLogin={handleLogin} />;
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