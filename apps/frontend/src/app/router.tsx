// T-001 All routes in one place
import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from '@/pages/Home/HomePage';

export const router = createBrowserRouter([{ path: '/', element: <HomePage /> }]);
