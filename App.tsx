import React, { useState, createContext, useContext, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, Parcel } from './types';
import { DataProvider, useData } from './context/DataContext';
import AdminDashboard from './components/admin/AdminDashboard';
import BrandDashboard from './components/client/ClientDashboard';
import DriverApp from './components/driver/DriverApp';
import TeamDashboard from './components/team/TeamDashboard';
import RoleSelectorScreen from './components/RoleSelectorScreen';
import LoginScreen from './components/LoginScreen';
import CustomerDashboard from './components/customer/CustomerDashboard';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';

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
    const { users, fetchData, loading, error } = useData();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [trackedParcel, setTrackedParcel] = useState<Parcel | null>(null);
    const [authStep, setAuthStep] = useState<'login' | 'selectRole'>('login');

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRoleSelect = (role: UserRole) => {
        let userToLogin: User | undefined;
        if (role === UserRole.BRAND) {
            userToLogin = users.find(u => u.role === role && u.pickupLocations && u.pickupLocations.length > 0) || users.find(u => u.role === role);
        } else {
            userToLogin = users.find(u => u.role === role);
        }

        if (userToLogin) {
            setCurrentUser(userToLogin);
        } else {
            alert(`No user with the role "${role}" was found in the database. Please add one to proceed.`);
        }
    };
    
    const handleCustomerLogin = (user: User, parcel: Parcel) => {
        setCurrentUser(user);
        setTrackedParcel(parcel);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setTrackedParcel(null);
        setAuthStep('login');
    };
    
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                    <p className="mt-4 text-lg text-content-secondary">Loading Application Data...</p>
                </div>
            );
        }

        if (error) {
            return (
                 <div className="flex flex-col justify-center items-center h-screen text-center p-4">
                    <AlertTriangleIcon className="w-12 h-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-content-primary mb-2">Error Loading Data</h2>
                    <p className="text-content-secondary mb-4 max-w-md">{error}</p>
                 </div>
            );
        }

        if (!currentUser) {
            if (authStep === 'login') {
                return <LoginScreen onShowRoleSelector={() => setAuthStep('selectRole')} onLogin={handleCustomerLogin} />;
            }
            return <RoleSelectorScreen onSelectRole={handleRoleSelect} />;
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
            case UserRole.CUSTOMER:
                if (trackedParcel) {
                     return <CustomerDashboard user={currentUser} parcel={trackedParcel} onLogout={handleLogout} />;
                }
                // Fallback if parcel somehow missing
                return <LoginScreen onShowRoleSelector={() => setAuthStep('selectRole')} onLogin={handleCustomerLogin} />;
            default:
                 return <RoleSelectorScreen onSelectRole={handleRoleSelect} />;
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