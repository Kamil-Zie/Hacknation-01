// T-001 All routes in one place
import { createBrowserRouter } from 'react-router-dom';

import { StartPage } from '@/pages/Start/StartPage';

export const router = createBrowserRouter([{ path: '/', element: <StartPage /> }]);
