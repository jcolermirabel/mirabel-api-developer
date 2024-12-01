import { createContext, useContext, useState } from 'react';

const SelectionContext = createContext(null);

export const SelectionProvider = ({ children }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());

  const toggleSelection = (id) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = (ids) => {
    setSelectedItems(new Set(ids));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  return (
    <SelectionContext.Provider value={{
      selectedItems,
      toggleSelection,
      selectAll,
      clearSelection
    }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext); 