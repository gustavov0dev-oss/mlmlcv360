import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '@/lib/backend';
import { newsPageDefaults, type NewsRow } from '@/lib/newsContent';
export function useNews(admin = false) {
  const database = useDatabase();
  const [rows,setRows] = useState<NewsRow[]>([]);
  const [settings,setSettings] = useState(newsPageDefaults);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(false);
  const load = useCallback(async () => {
    try {
      const [posts,page] = await Promise.all([
        database.select<NewsRow>('novedades_posts',{filter:admin?undefined:{status:'published'},order:[{column:'sort_order'},{column:'created_at',ascending:false}]}),
        database.select<{data: typeof newsPageDefaults}>('novedades_page',{filter:{id:'main'}}),
      ]);
      if(posts.error || page.error) throw new Error('load');
      setRows(((posts.data as NewsRow[]) || []).map(row=>({...row,data:{...row.data,views:row.view_count||0}})));
      setSettings({...newsPageDefaults,...(page.data as {data: typeof newsPageDefaults}[])?.[0]?.data});
      setError(false);
    } catch { setError(true); } finally {setLoading(false);}
  },[database,admin]);
  useEffect(()=> { void load(); const unsub=database.subscribe('novedades_posts',()=>void load()); const unsubPage=database.subscribe('novedades_page',()=>void load()); const focus=()=>void load(); window.addEventListener('focus',focus); return ()=>{unsub();unsubPage();window.removeEventListener('focus',focus);}; },[load,database]);
  return {rows,settings,loading,error,reload:load};
}
