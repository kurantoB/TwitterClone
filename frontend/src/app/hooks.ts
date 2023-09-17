import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { AppState } from "./appState";
import store from "./store"

export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector
export const useAppDispatch = () => useDispatch<typeof store.dispatch>()