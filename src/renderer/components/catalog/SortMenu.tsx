// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as React from "react";
import * as style from "readium-desktop/renderer/assets/styles/myBooks.css";

import { TranslatorProps, withTranslator } from "../utils/hoc/translator";

interface IProps extends TranslatorProps {
    onClickAlphaSort: () => void;
    onClickCountSort: () => void;
}

class SortMenu extends React.Component<IProps> {
    public render(): React.ReactElement<{}> {
        const { __ } = this.props;
        return (
            <div id={style.sortType}>
                <button role="menuitem"
                    onClick={this.props.onClickAlphaSort}> A-Z </button>
                <button role="menuitem"
                    onClick={this.props.onClickCountSort}> {__("catalog.tagCount")} </button>
            </div>
        );
    }
}

export default withTranslator(SortMenu);
