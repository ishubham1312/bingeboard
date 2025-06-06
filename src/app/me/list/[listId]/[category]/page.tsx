'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getListById, type ListItem } from '@/services/watchedItemsService';
import { ContentCard } from '@/components/content/content-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Film, Tv, Brush, Clapperboard } from 'lucide-react';
import { format, parse } from 'date-fns';

interface CategoryPageProps {
  params: {
    listId: string;
    category: string;
  };
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const { listId, category } = params;
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');
  const router = useRouter();
  
  const [list, setList] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredItems, setFilteredItems] = useState<ListItem[]>([]);
  const [groupedByMonth, setGroupedByMonth] = useState<Record<string, ListItem[]>>({});

  useEffect(() => {
    const fetchList = async () => {
      try {
        const listData = getListById(listId);
        if (!listData) {
          router.push(`/me/list/${listId}`);
          return;
        }
        
        setList(listData);
        
        // Filter items by category
        let items: ListItem[] = [];
        const categoryKey = category.toLowerCase();
        
        if (categoryKey === 'web-series') {
          items = listData.items.filter((item: ListItem) => item.media_type === 'tv');
        } else if (categoryKey === 'anime') {
          items = listData.items.filter((item: ListItem) => 
            item.media_type === 'movie' && item.genre_ids?.includes(16)
          );
        } else if (categoryKey === 'hollywood') {
          items = listData.items.filter((item: ListItem) => 
            item.media_type === 'movie' && item.original_language === 'en' && !item.genre_ids?.includes(16)
          );
        } else if (categoryKey === 'bollywood') {
          items = listData.items.filter((item: ListItem) => 
            item.media_type === 'movie' && item.original_language === 'hi'
          );
        } else {
          items = listData.items.filter((item: ListItem) => 
            item.media_type === 'movie' && 
            item.original_language !== 'en' && 
            item.original_language !== 'hi' &&
            !item.genre_ids?.includes(16)
          );
        }
        
        setFilteredItems(items);
        
        // Group by month
        const grouped: Record<string, ListItem[]> = {};
        
        items.forEach((item) => {
          if (!item.addedAt) return;
          
          const date = new Date(item.addedAt);
          const monthYear = format(date, 'MMMM yyyy');
          
          if (!grouped[monthYear]) {
            grouped[monthYear] = [];
          }
          
          grouped[monthYear].push(item);
        });
        
        // Sort months in descending order
        const sortedGrouped = Object.keys(grouped)
          .sort((a, b) => {
            const dateA = parse(a, 'MMMM yyyy', new Date());
            const dateB = parse(b, 'MMMM yyyy', new Date());
            return dateB.getTime() - dateA.getTime();
          })
          .reduce((acc, key) => {
            acc[key] = grouped[key];
            return acc;
          }, {} as Record<string, ListItem[]>);
        
        setGroupedByMonth(sortedGrouped);
        
      } catch (error) {
        console.error('Error fetching list:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchList();
  }, [listId, category, router]);

  const getCategoryIcon = () => {
    switch (category.toLowerCase()) {
      case 'web-series':
        return <Tv className="mr-2 h-5 w-5" />;
      case 'anime':
        return <Brush className="mr-2 h-5 w-5" />;
      case 'hollywood':
        return <Film className="mr-2 h-5 w-5" />;
      case 'bollywood':
        return <Clapperboard className="mr-2 h-5 w-5" />;
      default:
        return <Film className="mr-2 h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="w-full aspect-[2/3] rounded-lg bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        onClick={() => router.push(`/me/list/${listId}`)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to List
      </Button>
      
      <div className="flex items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          {getCategoryIcon()}
          {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          <span className="text-muted-foreground ml-2">({filteredItems.length})</span>
        </h1>
      </div>
      
      <div className="space-y-10">
        {Object.entries(groupedByMonth).map(([month, items]) => (
          <div key={month} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{month}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <div key={`${item.id}-${item.media_type}`} className="w-full">
                  <ContentCard 
                    item={item} 
                    currentListId={listId}
                    showAddToList={false}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
