//Imports
const bcrypt = require('bcrypt');
const fileSystem = require('fs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

//Setup
const User = require('../models/user');
const Post = require('../models/post');
const doAction = require('../utils/actions/common');
const doPostAction = require('../utils/actions/post');
const check = require('../utils/checks/common');
const checkUser = require('../utils/checks/user');
const checkPost = require('../utils/checks/post');
const errorFunctions = require('../utils/responses/errors');
const successFunctions = require('../utils/responses/successes');

//Exports
exports.getAllPosts = (request, response, next) => {
    const askingUserId = request.auth.userId;
    const postLoadedByClient = request.params.loaded;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the requester isn't suspended
        if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 2)) {
            Post.countDocuments({}, function (error, count) {
                if (error) {
                    errorFunctions.sendServerError(response);
                } else {
                    doPostAction
                        .findHomepagePosts(response, Post, count - 1, postLoadedByClient)
                        .then((postList) => {
                            response.status(200).json(postList);
                        })
                        .catch((error) => errorFunctions.sendServerError(response));
                }
            });
        }
    });
};

exports.getOnePost = (request, response, next) => {
    const askingUserId = request.auth.userId;
    const targetPostId = request.params.id;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the post exists
        check.ifDocumentExists(response, Post, { _id: targetPostId }, "This post doesn't exists", (targetPost) => {
            //Checking if the requester isn't restrained or suspended
            if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 1)) {
                //Getting the content of the comments
                doPostAction.findChildPostsContent(response, Post, targetPost.childPosts).then((comments) => {
                    doAction.getUserDisplayName(response, targetPost.uploaderId).then((uploaderDisplayName) => {
                        //Sending the result
                        const detailledPost = {
                            _id: targetPost._id,
                            uploaderId: targetPost.uploaderId,
                            uploaderDisplayName: uploaderDisplayName,
                            comments: comments,
                            likeCounter: targetPost.userLikeList.length,
                            contentText: targetPost.contentText,
                            contentImg: targetPost.contentImg,
                            uploadDate: targetPost.uploadDate,
                            editCounter: targetPost.editCounter,
                        };
                        response.status(200).json(detailledPost);
                    });
                });
            }
        });
    });
};

exports.getNewPosts = (request, response, next) => {
    const askingUserId = request.auth.userId;
    const lastPostSeenId = request.params.id;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the requester isn't suspended
        if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 2)) {
            Post.findOne({ _id: lastPostSeenId })
                .then((lastPostSeen) => {
                    if (lastPostSeen === null) {
                        errorFunctions.sendBadRequestError(response);
                    } else {
                        const lastIndex = lastPostSeen.postUploadedBefore;
                        //Finding every new post
                        let newPostList = [];
                        doPostAction.findNewPost(response, Post, lastIndex + 1, newPostList);
                    }
                })
                .catch((error) => errorFunctions.sendServerError(response));
        }
    });
};

exports.uploadPost = (request, response, next) => {
    const askingUserId = request.auth.userId;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the requester isn't restrained or suspended
        if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 1)) {
            const contentImg = request.file ? doPostAction.buildImageUploadedURL(request) : 'no_img';
            const contentTxt = request.body.uploadFormTxt;
            if (checkPost.ifContentTxtIsValid(contentTxt)) {
                //Couting how much posts existed on the database before
                doPostAction.getPostUploadedBefore(response, Post).then((newPostIndex) => {
                    const upload = new Post({
                        postUploadedBefore: newPostIndex,
                        uploaderId: askingUserId,
                        parentPost: 'null',
                        childPosts: [],
                        userLikeList: [],
                        contentText: contentTxt,
                        contentImg: contentImg,
                        uploadDate: Date.now(),
                        editCounter: 0,
                    });
                    upload
                        .save()
                        //Post created
                        .then(() => {
                            successFunctions.sendUploadSuccess(response);
                        })
                        //Creation failed
                        .catch((error) => errorFunctions.sendServerError(response, error));
                });
                /*Post.countDocuments({}, function (err, count) {
                    const upload = new Post({
                        postUploadedBefore: count,
                        uploaderId: askingUserId,
                        parentPost: 'null',
                        childPosts: [],
                        userLikeList: [],
                        contentText: contentTxt,
                        contentImg: contentImg,
                        uploadDate: Date.now(),
                        editCounter: 0,
                    });
                    upload
                        .save()
                        //Post created
                        .then(() => {
                            successFunctions.sendUploadSuccess(response);
                        })
                        //Creation failed
                        .catch((error) => errorFunctions.sendServerError(response, error));
                });*/
            }
        }
    });
};

exports.commentPost = (request, response, next) => {
    const askingUserId = request.auth.userId;
    const targetPostId = request.params.id;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the post exists
        check.ifDocumentExists(response, Post, { _id: targetPostId }, "This post doesn't exists", (targetPost) => {
            //Checking if the requester isn't restrained or suspended
            if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 1)) {
                const contentImg = request.file ? doPostAction.buildImageUploadedURL(request) : 'no_img';
                const contentTxt = request.body.uploadFormTxt;
                if (checkPost.ifContentTxtIsValid(contentTxt)) {
                    //Couting how much posts existed on the database before
                    Post.count({}, function (err, count) {
                        const upload = new Post({
                            postUploadedBefore: count,
                            uploaderId: askingUserId,
                            parentPost: targetPost._id,
                            childPosts: [],
                            userLikeList: [],
                            contentText: contentTxt,
                            contentImg: contentImg,
                            uploadDate: Date.now(),
                            editCounter: 0,
                        });
                        upload
                            .save()
                            //Post created
                            .then((targetComment) => {
                                targetPost.childPosts.push(targetComment._id);
                                //updating the parent post on the database to include the comment as a child
                                doAction.updateDocumentOnDB(response, Post, targetPostId, targetPost, () => {
                                    doPostAction.formatSimplifiedPost(response, targetComment).then((returnedUploadedComment) => {
                                        response.status(201).json({ returnedUploadedComment });
                                    });
                                });
                            })
                            //Creation failed
                            .catch((error) => errorFunctions.sendServerError(response, error));
                    });
                }
            }
        });
    });
};

exports.likePost = (request, response, next) => {
    const askingUserId = request.auth.userId;
    const targetPostId = request.params.id;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the post exists
        check.ifDocumentExists(response, Post, { _id: targetPostId }, "This post doesn't exists", (targetPost) => {
            //Checking if the requester isn't restrained or suspended
            if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 1)) {
                let message = 'Liked';
                if (targetPost.userLikeList.includes(askingUserId) === false) {
                    //User hasn't liked yet: we like
                    targetPost.userLikeList.push(askingUserId);
                } else {
                    message = 'Unliked';
                    //User has already liked: we remove the like
                    const userIdIndexLike = targetPost.userLikeList.indexOf(askingUserId);
                    targetPost.userLikeList.splice(userIdIndexLike);
                }
                const newLikeCounter = targetPost.userLikeList.length;
                //Updating the likes on the data base
                doAction.updateDocumentOnDB(response, Post, targetPostId, targetPost, () => {
                    response.status(200).json({ message, newLikeCounter });
                });
            }
        });
    });
};

exports.modifyPost = (request, response, next) => {
    const askingUserId = request.auth.userId;
    const targetPostId = request.params.id;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the post exists
        check.ifDocumentExists(response, Post, { _id: targetPostId }, "This post doesn't exists", (targetPost) => {
            //Checking if the requester isn't restrained or suspended
            if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 1)) {
                //Checking if the requester own the post
                if (askingUserId === targetPost.uploaderId) {
                    const contentTxt = request.body.uploadFormTxt;
                    if (checkPost.ifContentTxtIsValid(contentTxt)) {
                        const oldContentImg = targetPost.contentImg;
                        let contentImg = oldContentImg;
                        let imageIsChanged = false;
                        if (request.file) {
                            //Image is changed
                            contentImg = doPostAction.buildImageUploadedURL(request);
                            imageIsChanged = true;
                        } else {
                            if (request.body.uploadFormImg === 'no_img') {
                                //Image is changed to be removed
                                contentImg = request.body.uploadFormImg;
                                imageIsChanged = true;
                            }
                        }
                        //updating the img and text of the post
                        targetPost.contentImg = contentImg;
                        targetPost.contentText = contentTxt;
                        targetPost.editCounter++;
                        const newPostContent = {
                            _id: targetPost._id,
                            contentText: targetPost.contentText,
                            contentImg: targetPost.contentImg,
                        };
                        //deleting the old image
                        if (imageIsChanged) {
                            const filename = oldContentImg.split('/images/')[1];
                            fileSystem.unlink(`images/${filename}`, () => {
                                //updating the post on the database
                                doAction.updateDocumentOnDB(response, Post, targetPostId, targetPost, () => {
                                    response.status(200).json(newPostContent);
                                });
                            });
                        } else {
                            //updating the post on the database
                            doAction.updateDocumentOnDB(response, Post, targetPostId, targetPost, () => {
                                response.status(200).json(newPostContent);
                            });
                        }
                    }
                } else {
                    errorFunctions.sendUnauthorizeError(response, "Impossible to edit this post : you don't own it");
                }
            }
        });
    });
};

exports.deletePost = (request, response, next) => {
    const askingUserId = request.auth.userId;
    const targetPostId = request.params.id;
    //Getting the requester account
    check.ifDocumentExists(response, User, { _id: askingUserId }, 'Invalid token', (askingUser) => {
        //Checking if the post exists
        check.ifDocumentExists(response, Post, { _id: targetPostId }, "This post doesn't exists", (targetPost) => {
            //Checking if the requester isn't restrained or suspended
            if (checkUser.ifHasRequiredPrivilege(response, askingUser, 0, 1)) {
                //Checking if the requester can do this action (deleting your own post or being moderator/admin)
                if (askingUserId === targetPost.uploaderId || checkUser.ifHasRequiredPrivilege(response, askingUser, 1, 1) === true) {
                    //Deleting the image of the sauce on the server
                    const filename = targetPost.contentImg.split('/images/')[1];
                    fileSystem.unlink(`images/${filename}`, () => {
                        //Deleting the sauce from the data base
                        Post.deleteOne({ _id: targetPostId })
                            .then(() => successFunctions.sendDeleteSuccess(response))
                            .catch((error) => errorFunctions.sendServerError(response));
                    });
                }
            }
        });
    });
};
