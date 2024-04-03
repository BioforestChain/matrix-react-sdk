/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2019, 2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import classNames from "classnames";
import React, { type ReactElement } from "react";

import { useMatrixChatRouteContext } from "../../../contexts/MatrixChatRouteContext";
interface IProps extends React.HTMLAttributes<HTMLDivElement> {
    isLegacyRoomHeaderBackButon: boolean;
}
export const BackButton: React.FC<IProps> = ({ children, isLegacyRoomHeaderBackButon }) => {
    const classes = classNames({
        mx_LegacyRoomHeader_backButon: isLegacyRoomHeaderBackButon ? true : false,
        mx_AccessibleReturnButton: isLegacyRoomHeaderBackButon ? false : true,
    });
    const context = useMatrixChatRouteContext();
    const onBackToChatList = (): void => {
        context.loggedInViewSetState({ ...context.loggedInViewState, enterRoomTochat: false });
    };
    return (
        <button onClick={onBackToChatList} className={classes}>
            {children}
        </button>
    );
};

export const EnterChatButton: React.FC = ({ children }): ReactElement => {
    const context = useMatrixChatRouteContext();
    const onRnterToChat = (): void => {
        context.loggedInViewSetState({ ...context.loggedInViewState, enterRoomTochat: true });
    };
    return <div onClick={onRnterToChat}> {children}</div>;
};
