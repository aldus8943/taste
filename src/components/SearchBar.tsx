'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchBar({
  searchQuery,
  onSearchChange,
}: SearchBarProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-600">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="음식점 이름 또는 동/도로명 검색 (예: 뚝배기, 테헤란로)"
        className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xs"
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-700"
          aria-label="검색어 지우기"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
