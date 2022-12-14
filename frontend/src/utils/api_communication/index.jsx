//Imports
import axios from 'axios';

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

export async function getMyAccountInfo(token, updateToken, updateAccountInfo) {
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

export async function getAllUsers(token, setUsers, setShowErrorApiResponse) {
    try {
        const result = await communicateWithAPI('http://localhost:8000/api/users', 'GET', token, null);
        setUsers(result.data);
        setShowErrorApiResponse(null);
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function setUserRole(token, users, setUsers, userId, newRole, setShowErrorApiResponse) {
    try {
        await communicateWithAPI(`http://localhost:8000/api/users/role/${userId}`, 'PUT', token, { newRole });
        updateUserRoleLocally(users, setUsers, userId, newRole);
        setShowErrorApiResponse(null);
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function setUserState(token, users, setUsers, userId, newState, setShowErrorApiResponse) {
    try {
        await communicateWithAPI(`http://localhost:8000/api/users/state/${userId}`, 'PUT', token, { newState });
        updateUserStateLocally(users, setUsers, userId, newState);
        setShowErrorApiResponse(null);
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function getAllPosts(token, posts, setPosts, unread, setUnread, setShowErrorApiResponse) {
    try {
        const postLoaded = posts.length;
        const result = await communicateWithAPI(`http://localhost:8000/api/posts/${postLoaded}`, 'GET', token, null);
        if (result.status === 200) {
            if (!document.hasFocus()) {
                setUnread(unread + result.data.length);
            }
            setPosts([...posts, ...result.data]);
        }
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function getNewPosts(token, lastPostLoadedId, posts, setPosts, unread, setUnread, setShowErrorApiResponse) {
    try {
        if (token !== null) {
            if (lastPostLoadedId === null) {
                //No post yet, trying to get every posts from the api
                getAllPosts(token, posts, setPosts, unread, setUnread, setShowErrorApiResponse);
            } else {
                //Some posts are already shown, trying to get only new post from the api
                const result = await communicateWithAPI(`http://localhost:8000/api/posts/new/${lastPostLoadedId}`, 'GET', token, null);
                if (!document.hasFocus()) {
                    setUnread(unread + result.data.length);
                }
                setPosts([...result.data, ...posts]);
            }
        }
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function getPostDetails(token, postId, setPost, setShowErrorApiResponse) {
    try {
        const result = await communicateWithAPI(`http://localhost:8000/api/posts/details/${postId}`, 'GET', token, null);
        setPost(result.data);
        return true;
    } catch (error) {
        if (error.response.status === 404) {
            return false;
        }
        setShowErrorApiResponse(error.response.data.message);
        return true;
    }
}

export async function uploadPost(token, formContentTxt, uploadContentImg, parentPostId, setShowErrorApiResponse) {
    try {
        const formData = new FormData();
        formData.append('postFormTxt', formContentTxt);
        formData.append('postFormImg', uploadContentImg);
        const config = {
            headers: {
                'content-type': 'multipart/form-data',
            },
        };
        if (parentPostId === null) {
            await communicateWithAPI(`http://localhost:8000/api/posts`, 'POST', token, formData, config);
        } else {
            await communicateWithAPI(`http://localhost:8000/api/posts/${parentPostId}`, 'POST', token, formData, config);
        }
        return true;
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
        return false;
    }
}

export async function savePostEdit(token, formContentTxt, uploadContentImg, postId, setShowErrorApiResponse) {
    try {
        const formData = new FormData();
        formData.append('postFormTxt', formContentTxt);
        formData.append('postFormImg', uploadContentImg);
        const config = {
            headers: {
                'content-type': 'multipart/form-data',
            },
        };
        await communicateWithAPI(`http://localhost:8000/api/posts/${postId}`, 'PUT', token, formData, config);
        return true;
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
        return false;
    }
}

export function updatePostLikeLocally(post, setPost) {
    let action = undefined;
    //changing the like locally
    let newPost = JSON.parse(JSON.stringify(post));
    if (newPost.youHaveLiked === true) {
        newPost.likeCounter--;
    } else {
        newPost.likeCounter++;
    }
    newPost.youHaveLiked = !newPost.youHaveLiked;
    action = newPost.youHaveLiked;
    setPost(newPost);
    return action;
}

export function updatePostLikeInListLocally(postToLikeId, posts, setPosts) {
    let action = undefined;
    //changing the like locally
    let newPostList = JSON.parse(JSON.stringify(posts));
    for (let index in newPostList) {
        const post = newPostList[index];
        if (post._id === postToLikeId) {
            if (post.youHaveLiked === true) {
                post.likeCounter--;
            } else {
                post.likeCounter++;
            }
            post.youHaveLiked = !post.youHaveLiked;
            action = post.youHaveLiked;
            break;
        }
    }
    setPosts(newPostList);
    return action;
}

export async function likePost(token, postToLikeId, action, setShowErrorApiResponse) {
    try {
        //sending the new desired like state to the server
        await communicateWithAPI(`http://localhost:8000/api/posts/like/${postToLikeId}`, 'POST', token, { action });
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}

export async function deletePost(token, postToDeleteId, posts, setPosts, redirect, setShowErrorApiResponse) {
    try {
        await communicateWithAPI(`http://localhost:8000/api/posts/${postToDeleteId}`, 'DELETE', token, null);
        if (redirect === false) {
            let newPostList = JSON.parse(JSON.stringify(posts));
            for (let index in newPostList) {
                if (newPostList[index]._id === postToDeleteId) {
                    newPostList.splice(index, 1);
                    break;
                }
            }
            setPosts(newPostList);
        } else {
            redirect(-1);
        }
    } catch (error) {
        setShowErrorApiResponse(error.response.data.message);
    }
}
