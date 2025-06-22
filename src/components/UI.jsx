// src/components/UI.jsx

import React from 'react';
import { X } from 'lucide-react';

export const Card = ({ children, className = '' }) => (
    <div className={`bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-lg p-6 md:p-8 ${className}`}>
        {children}
    </div>
);

export const Button = ({ children, onClick, className = '', variant = 'primary', icon: Icon, disabled = false }) => {
    const baseClasses = 'flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500 transform hover:scale-105',
        secondary: 'bg-slate-700 text-slate-200 hover:bg-slate-600 focus:ring-slate-500',
        danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variants[variant]} ${className}`}>
            {Icon && <Icon size={20} />}
            {children && <span>{children}</span>}
        </button>
    );
};

export const Input = ({ value, onChange, placeholder, className = '', onKeyPress }) => (
    <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyPress={onKeyPress}
        className={`w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${className}`}
    />
);

export const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};