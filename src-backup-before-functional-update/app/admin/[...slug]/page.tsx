"use client";
import {useSearchParams,usePathname} from "next/navigation";
import {AdminRouter} from "../../../components/AdminPages";
export default function AdminRoute(){const pathname=usePathname();const search=useSearchParams();const key=pathname.replace(/^\/admin\/?/,'').split('/').filter(Boolean)[0]||'dashboard';return <AdminRouter routeKey={key} initialSearch={search.get('search')||''}/>}
