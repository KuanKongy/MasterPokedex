
import React, { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";

interface TabsProps {
  defaultIndex?: number;
  index?: number;
  onChange?: (index: number) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs = ({
  defaultIndex = 0,
  index,
  onChange,
  value,
  onValueChange,
  children,
  className = ""
}: TabsProps) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  
  const handleTabChange = (idx: number) => {
    if (onChange) {
      onChange(idx);
    } else if (!index) {
      setActiveIndex(idx);
    }
  };
  
  const currentIndex = index !== undefined ? index : activeIndex;
  
  const tabsList = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && child.type === TabsList
  );
  
  const tabsContent = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && child.type === TabsContent
  );
  
  return (
    <Box className={`tabs ${className}`}>
      {React.Children.map(tabsList, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeIndex: currentIndex,
            setActiveIndex: handleTabChange,
            value,
            onValueChange
          });
        }
        return child;
      })}
      
      {React.Children.map(tabsContent, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            index,
            activeIndex: currentIndex,
            value: (child.props as any).value,
            selectedValue: value,
          });
        }
        return child;
      })}
    </Box>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  activeIndex?: number;
  setActiveIndex?: (index: number) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const TabsList = ({ 
  children, 
  activeIndex = 0, 
  setActiveIndex,
  value,
  onValueChange, 
  className = ""
}: TabsListProps) => {
  return (
    <Flex 
      className={`tabs-list bg-muted p-1 rounded-md ${className}`} 
      gap={1}
      borderWidth="1px"
      borderRadius="md"
      overflow="hidden"
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const childValue = (child.props as any).value;
          const isActive = value !== undefined 
            ? childValue === value 
            : index === activeIndex;
          
          return React.cloneElement(child as React.ReactElement<any>, {
            isActive,
            onSelect: () => {
              if (value !== undefined && onValueChange) {
                onValueChange(childValue);
              } else if (setActiveIndex) {
                setActiveIndex(index);
              }
            },
          });
        }
        return child;
      })}
    </Flex>
  );
};

interface TabsTriggerProps {
  children: React.ReactNode;
  value: string;
  isActive?: boolean;
  onSelect?: () => void;
  className?: string;
}

export const TabsTrigger = ({ 
  children, 
  value,
  isActive = false, 
  onSelect,
  className = ""
}: TabsTriggerProps) => {
  return (
    <Box
      className={`tabs-trigger px-3 py-1.5 rounded-sm cursor-pointer ${className}`}
      onClick={onSelect}
      flex="1"
      textAlign="center"
      fontWeight={isActive ? "medium" : "normal"}
      bg={isActive ? "white" : "transparent"}
      color={isActive ? "gray.800" : "gray.600"}
      shadow={isActive ? "sm" : "none"}
    >
      {children}
    </Box>
  );
};

interface TabsContentProps {
  children: React.ReactNode;
  value?: string;
  selectedValue?: string;
  index?: number;
  activeIndex?: number;
  className?: string;
}

export const TabsContent = ({ 
  children, 
  value,
  selectedValue,
  index = 0, 
  activeIndex = 0,
  className = ""
}: TabsContentProps) => {
  const isVisible = value !== undefined && selectedValue !== undefined
    ? value === selectedValue
    : index === activeIndex;
    
  if (!isVisible) return null;
  
  return (
    <Box className={`tabs-content mt-2 ${className}`}>
      {children}
    </Box>
  );
};
