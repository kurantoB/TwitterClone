import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import Sidebar from "../components/Sidebar";
import { removeErrorMessage } from "../app/appState";

export default function Root() {
    const errors = useAppSelector((state) => state.errorMessages)
    const dispatch = useAppDispatch()

    const closeError = (index: number) => {
        dispatch(removeErrorMessage(index))
    }

    return (
        <>
            <Header />
            <div className="nonheader">
                <Sidebar />
                <div className="middle">
                    <ul className="errors">
                        {errors && errors.map((message, index) => (
                            <li key={index}>
                                {message}
                                <svg onClick={() => closeError(index)} className="feather feather-x-square" fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><rect height="18" rx="2" ry="2" width="18" x="3" y="3" /><line x1="9" x2="15" y1="9" y2="15" /><line x1="15" x2="9" y1="9" y2="15" /></svg>
                            </li>
                        ))}
                    </ul>
                    <Outlet />
                </div>
                <div></div>
            </div>
        </>
    )
}