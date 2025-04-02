
import React, { useState } from "react";
import { Box, Flex } from "@chakra-ui/react";

interface TabsProps {
  defaultIndex?: number;
  children: React.ReactNode;
}

export const Tabs = ({ defaultIndex = 0, children }: TabsProps) => {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  
  const tabsList = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && child.type === TabsList
  );
  
  const tabsContent = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && child.type === TabsContent
  );
  
  return (
    <Box className="tabs">
      {React.Children.map(tabsList, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            activeIndex,
            setActiveIndex,
          });
        }
        return child;
      })}
      
      {React.Children.map(tabsContent, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            index,
            activeIndex,
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
  className?: string;
}

export const TabsList = ({ children, activeIndex = 0, setActiveIndex, className }: TabsListProps) => {
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
          return React.cloneElement(child as React.ReactElement<any>, {
            isActive: index === activeIndex,
            onSelect: () => setActiveIndex?.(index),
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
  isActive = false, 
  onSelect,
  className 
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
  value: string;
  index?: number;
  activeIndex?: number;
  className?: string;
}

export const TabsContent = ({ 
  children, 
  index = 0, 
  activeIndex = 0,
  className 
}: TabsContentProps) => {
  if (index !== activeIndex) return null;
  
  return (
    <Box className={`tabs-content mt-2 ${className}`}>
      {children}
    </Box>
  );
};
