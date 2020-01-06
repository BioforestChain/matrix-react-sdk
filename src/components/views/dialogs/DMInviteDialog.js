/*
Copyright 2019, 2020 The Matrix.org Foundation C.I.C.

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

import React from 'react';
import PropTypes from 'prop-types';
import {_t} from "../../../languageHandler";
import sdk from "../../../index";
import MatrixClientPeg from "../../../MatrixClientPeg";
import {makeUserPermalink} from "../../../utils/permalinks/Permalinks";
import DMRoomMap from "../../../utils/DMRoomMap";
import {RoomMember} from "matrix-js-sdk/lib/matrix";
import * as humanize from "humanize";
import SdkConfig from "../../../SdkConfig";

// TODO: [TravisR] Make this generic for all kinds of invites

const INITIAL_ROOMS_SHOWN = 3; // Number of rooms to show at first
const INCREMENT_ROOMS_SHOWN = 5; // Number of rooms to add when 'show more' is clicked

class DMRoomTile extends React.PureComponent {
    static propTypes = {
        member: PropTypes.object.isRequired,
        lastActiveTs: PropTypes.number,
        onToggle: PropTypes.func.isRequired,
    };

    _onClick = (e) => {
        // Stop the browser from highlighting text
        e.preventDefault();
        e.stopPropagation();

        this.props.onToggle(this.props.member.userId);
    };

    render() {
        const MemberAvatar = sdk.getComponent("views.avatars.MemberAvatar");

        let timestamp = null;
        if (this.props.lastActiveTs) {
            // TODO: [TravisR] Figure out how to i18n this
            // `humanize` wants seconds for a timestamp, so divide by 1000
            const humanTs = humanize.relativeTime(this.props.lastActiveTs / 1000);
            timestamp = <span className='mx_DMInviteDialog_roomTile_time'>{humanTs}</span>;
        }

        return (
            <div className='mx_DMInviteDialog_roomTile' onClick={this._onClick}>
                <MemberAvatar member={this.props.member} width={36} height={36} />
                <span className='mx_DMInviteDialog_roomTile_name'>{this.props.member.name}</span>
                <span className='mx_DMInviteDialog_roomTile_userId'>{this.props.member.userId}</span>
                {timestamp}
            </div>
        );
    }
}

export default class DMInviteDialog extends React.PureComponent {
    static propTypes = {
        // Takes an array of user IDs/emails to invite.
        onFinished: PropTypes.func.isRequired,
    };

    constructor() {
        super();

        this.state = {
            targets: [], // string[] of mxids/email addresses
            filterText: "",
            recents: this._buildRecents(),
            numRecentsShown: INITIAL_ROOMS_SHOWN,
            suggestions: this._buildSuggestions(),
            numSuggestionsShown: INITIAL_ROOMS_SHOWN,
        };
    }

    _buildRecents(): {userId: string, user: RoomMember, lastActive: number} {
        const rooms = DMRoomMap.shared().getUniqueRoomsWithIndividuals();
        const recents = [];
        for (const userId in rooms) {
            const room = rooms[userId];
            const member = room.getMember(userId);
            if (!member) continue; // just skip people who don't have memberships for some reason

            const lastEventTs = room.timeline && room.timeline.length
                ? room.timeline[room.timeline.length - 1].getTs()
                : 0;
            if (!lastEventTs) continue; // something weird is going on with this room

            recents.push({userId, user: member, lastActive: lastEventTs});
        }

        // Sort the recents by last active to save us time later
        recents.sort((a, b) => b.lastActive - a.lastActive);

        return recents;
    }

    _buildSuggestions(): {userId: string, user: RoomMember} {
        const maxConsideredMembers = 200;
        const client = MatrixClientPeg.get();
        const excludedUserIds = [client.getUserId(), SdkConfig.get()['welcomeUserId']];
        const joinedRooms = client.getRooms()
            .filter(r => r.getMyMembership() === 'join')
            .filter(r => r.getJoinedMemberCount() <= maxConsideredMembers);

        // Generates { userId: {member, rooms[]} }
        const memberRooms = joinedRooms.reduce((members, room) => {
            const joinedMembers = room.getJoinedMembers().filter(u => !excludedUserIds.includes(u.userId));
            for (const member of joinedMembers) {
                if (!members[member.userId]) {
                    members[member.userId] = {
                        member: member,
                        // Track the room size of the 'picked' member so we can use the profile of
                        // the smallest room (likely a DM).
                        pickedMemberRoomSize: room.getJoinedMemberCount(),
                        rooms: [],
                    };
                }

                members[member.userId].rooms.push(room);

                if (room.getJoinedMemberCount() < members[member.userId].pickedMemberRoomSize) {
                    members[member.userId].member = member;
                    members[member.userId].pickedMemberRoomSize = room.getJoinedMemberCount();
                }
            }
            return members;
        }, {});

        // Generates { userId: {member, numRooms, score} }
        const memberScores = Object.values(memberRooms).reduce((scores, entry) => {
            const numMembersTotal = entry.rooms.reduce((c, r) => c + r.getJoinedMemberCount(), 0);
            const maxRange = maxConsideredMembers * entry.rooms.length;
            scores[entry.member.userId] = {
                member: entry.member,
                numRooms: entry.rooms.length,
                score: Math.max(0, Math.pow(1 - (numMembersTotal / maxRange), 5)),
            };
            return scores;
        }, {});

        const members = Object.values(memberScores);
        members.sort((a, b) => {
            if (a.score === b.score) {
                if (a.numRooms === b.numRooms) {
                    return a.member.userId.localeCompare(b.member.userId);
                }

                return b.numRooms - a.numRooms;
            }
            return b.score - a.score;
        });
        return members.map(m => ({userId: m.userId, user: m.member}));
    }

    _startDm = () => {
        this.props.onFinished(this.state.targets);
    };

    _cancel = () => {
        this.props.onFinished([]);
    };

    _updateFilter = (e) => {
        this.setState({filterText: e.target.value});
    };

    _showMoreRecents = () => {
        this.setState({numRecentsShown: this.state.numRecentsShown + INCREMENT_ROOMS_SHOWN});
    };

    _showMoreSuggestions = () => {
        this.setState({numSuggestionsShown: this.state.numSuggestionsShown + INCREMENT_ROOMS_SHOWN});
    };

    _toggleMember = (userId) => {
        const targets = this.state.targets.map(t => t); // cheap clone for mutation
        const idx = targets.indexOf(userId);
        if (idx >= 0) targets.splice(idx, 1);
        else targets.push(userId);
        this.setState({targets});
    };

    _renderSection(kind: "recents"|"suggestions") {
        const sourceMembers = kind === 'recents' ? this.state.recents : this.state.suggestions;
        let showNum = kind === 'recents' ? this.state.numRecentsShown : this.state.numSuggestionsShown;
        const showMoreFn = kind === 'recents' ? this._showMoreRecents.bind(this) : this._showMoreSuggestions.bind(this);
        const lastActive = (m) => kind === 'recents' ? m.lastActive : null;
        const sectionName = kind === 'recents' ? _t("Recent Conversations") : _t("Suggestions");

        if (!sourceMembers || sourceMembers.length === 0) return null;

        // If we're going to hide one member behind 'show more', just use up the space of the button
        // with the member's tile instead.
        if (showNum === sourceMembers.length - 1) showNum++;

        // .slice() will return an incomplete array but won't error on us if we go too far
        const toRender = sourceMembers.slice(0, showNum);
        const hasMore = toRender.length < sourceMembers.length;

        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");
        let showMore = null;
        if (hasMore) {
            showMore = (
                <AccessibleButton onClick={showMoreFn} kind="link">
                    {_t("Show more")}
                </AccessibleButton>
            );
        }

        const tiles = toRender.map(r => (
            <DMRoomTile member={r.user} lastActiveTs={lastActive(r)} key={r.userId} onToggle={this._toggleMember} />
        ));
        return (
            <div className='mx_DMInviteDialog_section'>
                <h3>{sectionName}</h3>
                {tiles}
                {showMore}
            </div>
        );
    }

    render() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const Field = sdk.getComponent("elements.Field");
        const AccessibleButton = sdk.getComponent("elements.AccessibleButton");

        // Dev note: The use of Field is temporary/incomplete pending https://github.com/vector-im/riot-web/issues/11197
        // For now, we just list who the targets are.
        const editor = (
            <div className='mx_DMInviteDialog_editor'>
                <Field
                    id="inviteTargets"
                    value={this.state.filterText}
                    onChange={this._updateFilter}
                    placeholder="TODO: Implement filtering/searching (vector-im/riot-web#11199)"
                />
            </div>
        );
        const targets = this.state.targets.map(t => <div key={t}>{t}</div>);

        const userId = MatrixClientPeg.get().getUserId();
        return (
            <BaseDialog
                className='mx_DMInviteDialog'
                hasCancel={true}
                onFinished={this._cancel}
                title={_t("Direct Messages")}
            >
                <div className='mx_DMInviteDialog_content'>
                    <p>
                        {_t(
                            "If you can't find someone, ask them for their username, or share your " +
                            "username (%(userId)s) or <a>profile link</a>.",
                            {userId},
                            {a: (sub) => <a href={makeUserPermalink(userId)} rel="noopener" target="_blank">{sub}</a>},
                        )}
                    </p>
                    {targets}
                    <div className='mx_DMInviteDialog_addressBar'>
                        {editor}
                        <AccessibleButton
                            kind="primary"
                            onClick={this._startDm}
                            className='mx_DMInviteDialog_goButton'
                        >
                            {_t("Go")}
                        </AccessibleButton>
                    </div>
                    {this._renderSection('recents')}
                    {this._renderSection('suggestions')}
                </div>
            </BaseDialog>
        );
    }
}
