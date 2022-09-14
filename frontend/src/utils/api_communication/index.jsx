//Imports
import axios from 'axios';
//import {  } from '../misc/index';

//Reused functions
function updateUserRoleLocally(users, setUsers, userId, newRole) {
    let newUsers = JSON.parse(JSON.stringify(users));
    for (let index in newUsers) {
        const user = newUsers[index];
        if (user._id === userId) {
            user.role = newRole;
            break;
        }
    }
    setUsers(newUsers);
}
function updateUserStateLocally(users, setUsers, userId, newState) {
    let newUsers = JSON.parse(JSON.stringify(users));
    for (let index in newUsers) {
        const user = newUsers[index];
        if (user._id === userId) {
            user.state = newState;
            break;
        }
    }
    setUsers(newUsers);
}

//Exports
export async function communicateWithAPI(url, verb, token, body, overwrittenConfig = null) {
    let config = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (overwrittenConfig !== null) {
        config = overwrittenConfig;
    }
    config.headers.Authorization = `Bearer ${token}`;
    let method = axios.get;
    switch (verb) {
        case 'POST':
            method = axios.post;
            break;
        case 'PUT':
            method = axios.put;
            break;
        case 'DELETE':
            method = axios.delete;
            break;
        default:
            break;
    }
    if (body === null) {
        return await method(url, config);
    } else {
        return await method(url, body, config);
    }
}

export async function submitSignUp(token, updateToken, { email, password }, setShowErrorApiResponse) {
    try {
        const result = await communicateWithAPI('http://localhost:8000/api/auth/signup', 'POST', token, {
            email,
            password,
        });
        if (result.status === 201) {
            //account creation success
            submitLogIn(token, updateToken, { email, password }, setShowErrorApiResponse);
        }
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function submitLogIn(token, updateToken, { email, password }, setShowErrorApiResponse) {
    try {
        const result = await communicateWithAPI('http://localhost:8000/api/auth/login', 'POST', token, {
            email,
            password,
        });
        updateToken(result.data.token);
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function getMyAccountInfo(token, updateToken, updateAccountInfo, redirect) {
    try {
        const result = await communicateWithAPI('http://localhost:8000/api/users/me', 'GET', token, null);
        const account = result.data;
        updateAccountInfo(account.userId, account.displayName, account.role, account.state);
    } catch (error) {
        if (error.response.status !== 500) {
            updateToken(null);
        }
    }
}

export async function getAllUsers(token, updateToken, setUsers, setShowErrorApiResponse) {
    try {
        const result = await communicateWithAPI('http://localhost:8000/api/users', 'GET', token, null);
        setUsers(result.data);
        setShowErrorApiResponse(null);
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function setUserRole(token, updateToken, users, setUsers, userId, newRole, setShowErrorApiResponse) {
    try {
        await communicateWithAPI(`http://localhost:8000/api/users/role/${userId}`, 'PUT', token, { newRole });
        updateUserRoleLocally(users, setUsers, userId, newRole);
        setShowErrorApiResponse(null);
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}
export async function setUserState(token, updateToken, users, setUsers, userId, newState, setShowErrorApiResponse) {
    try {
        await communicateWithAPI(`http://localhost:8000/api/users/state/${userId}`, 'PUT', token, { newState });
        updateUserStateLocally(users, setUsers, userId, newState);
        setShowErrorApiResponse(null);
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}