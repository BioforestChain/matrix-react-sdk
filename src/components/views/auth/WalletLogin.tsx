/*
Copyright 2015, 2016, 2017, 2019 The Matrix.org Foundation C.I.C.

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

import React, { SyntheticEvent } from "react";
// import classNames from "classnames";

import { _t } from "../../../languageHandler";

interface IProps {
    loginIncorrect: boolean;
    disableSubmit?: boolean;
    busy?: boolean;

    onSubmit(): void;
}

/*
 * A pure UI component which displays a wallet login button.
 * The email/username/phone fields are fully-controlled, the password field is not.
 */
export default class WalletLogin extends React.PureComponent<IProps> {
    public static defaultProps = {
        onUsernameChanged: function () {},
        onUsernameBlur: function () {},
        onPhoneCountryChanged: function () {},
        onPhoneNumberChanged: function () {},
        loginIncorrect: false,
        disableSubmit: false,
    };

    public constructor(props: IProps) {
        super(props);
        this.state = {};
    }

    private onSubmit = async (ev: SyntheticEvent): Promise<void> => {
        ev.preventDefault();
        this.props.onSubmit();
    };

    public render(): React.ReactNode {
        return (
            <div>
                <form onSubmit={this.onSubmit}>
                    {!this.props.busy && (
                        <input
                            className="mx_Login_submit"
                            type="submit"
                            value={_t("action|sign_in")}
                            disabled={this.props.disableSubmit}
                        />
                    )}
                </form>
            </div>
        );
    }
}
