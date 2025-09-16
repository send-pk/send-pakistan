import React from 'react';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { Logo } from './shared/Logo';
import { ThemeToggle } from './shared/ThemeToggle';
import { UserRole } from '../types';
import { UserIcon } from './icons/UserIcon';
import { TruckIcon } from './icons/TruckIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { UsersIcon } from './icons/UsersIcon';

interface RoleSelectorScreenProps {
  onSelectRole: (role: UserRole) => void;
}

const RoleSelectorScreen: React.FC<RoleSelectorScreenProps> = ({ onSelectRole }) => {
    return (
        <div className="min-h-screen bg-background text-content-primary flex flex-col items-center justify-center main-bg p-4">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <Logo textClassName="text-4xl" />
            <p className="mt-2 mb-8 text-content-secondary">
                Select a role to view a dashboard (demo mode).
            </p>
            <Card className="w-full max-w-sm p-6">
                <div className="space-y-4">
                    <Button onClick={() => onSelectRole(UserRole.ADMIN)} size="lg" className="w-full flex items-center justify-center gap-2">
                        <BuildingOfficeIcon className="w-5 h-5" />
                        View Admin Dashboard
                    </Button>
                    <Button onClick={() => onSelectRole(UserRole.BRAND)} size="lg" className="w-full flex items-center justify-center gap-2">
                         <UserIcon className="w-5 h-5" />
                        View Brand Portal
                    </Button>
                     <Button onClick={() => onSelectRole(UserRole.DRIVER)} size="lg" className="w-full flex items-center justify-center gap-2">
                        <TruckIcon className="w-5 h-5" />
                        View Driver App
                    </Button>
                     <Button onClick={() => onSelectRole(UserRole.SALES_MANAGER)} size="lg" className="w-full flex items-center justify-center gap-2">
                        <UsersIcon className="w-5 h-5" />
                        View Team Portal
                    </Button>
                </div>
            </Card>
             <footer className="text-center py-8 px-4 sm:px-6 absolute bottom-0">
                <p className="text-sm text-content-muted">
                    © 2025 SEND. Powered By stor.
                </p>
            </footer>
        </div>
    );
};

export default RoleSelectorScreen;
