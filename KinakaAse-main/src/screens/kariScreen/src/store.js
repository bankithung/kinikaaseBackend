import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

const initialState = {
  user: { token: null, userId: null, role: null, registrationCompleted: false },
  trip: null,
  riderLocations: [],
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'SET_TRIP':
      return { ...state, trip: action.payload };
    case 'SET_RIDER_LOCATIONS':
      return { ...state, riderLocations: action.payload };
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
};

const store = createStore(reducer, applyMiddleware(thunk));
export default store;