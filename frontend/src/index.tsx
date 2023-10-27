import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import Root from './pages/Root';
import { Provider } from 'react-redux';
import store from './app/store';
import Home from './pages/Home'
import { GoogleOAuthProvider } from '@react-oauth/google'
import CreateOrEditAccount from './pages/CreateOrEditAccount';
import ViewProfile from './pages/ViewProfile';
import RouteError from './pages/RouteError';
import WentWrong from './components/WentWrong';
import ViewBlockedHandles from './pages/ViewBlockedHandles';
import { useAppSelector } from './app/hooks';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "",
        element: <Home />
      },
      {
        path: "/create-account",
        element: <CreateOrEditAccount edit={false} />
      },
      {
        path: "/u/:username",
        element: <ViewProfile />,
      },
      {
        path: "/blocked",
        element: <ViewBlockedHandles />
      },
      {
        path: "/edit-profile",
        element: <CreateOrEditAccount edit={true} />
      },
      {
        path: "/error",
        element: <WentWrong />
      }
    ],
    errorElement: <RouteError />
  }
])

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
)
root.render(
  // <React.StrictMode>
  <GoogleOAuthProvider clientId={process.env.REACT_APP_CLIENT_ID ? process.env.REACT_APP_CLIENT_ID : ""}>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </GoogleOAuthProvider>
  // </React.StrictMode>
);