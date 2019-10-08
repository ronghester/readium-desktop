// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as commonmark from "commonmark";
import { readFile } from "fs";
import * as path from "path";
import * as React from "react";
import { connect } from "react-redux";
import { dialogActions } from "readium-desktop/common/redux/actions";
import { setLocale } from "readium-desktop/common/redux/actions/i18n";
import { _PACKAGING } from "readium-desktop/preprocessor-directives";
import {
    TranslatorProps, withTranslator,
} from "readium-desktop/renderer/components/utils/hoc/translator";
import { RootState } from "readium-desktop/renderer/redux/states";
import { promisify } from "util";

import Dialog from "../dialog/Dialog";

interface IProps extends TranslatorProps, ReturnType<typeof mapDispatchToProps>, ReturnType<typeof mapStateToProps> {
}

interface IStates {
    placeholder: any;
}

export class LanguageSettings extends React.Component<IProps, IStates> {
    private parsedMarkdown: string;

    public constructor(props: IProps) {
        super(props);

        this.state = {
            placeholder: undefined,
        };
    }

    public async componentDidMount() {
        const { locale } = this.props;
        const infoFolderRelativePath = "assets/md/information";

        let folderPath: string = path.join((global as any).__dirname, infoFolderRelativePath);
        try {
            if (_PACKAGING === "0") {
                folderPath = path.join(process.cwd(), "dist", infoFolderRelativePath);
            }
            const fileContent = await promisify(readFile)(path.join(folderPath, `${locale}.md`), {encoding: "utf8"});
            this.parsedMarkdown = (new commonmark.HtmlRenderer()).render((new commonmark.Parser()).parse(fileContent));
        } catch (__) {
            this.parsedMarkdown = "<h1>There is no information for your language</h1>";
        }
        this.forceUpdate();
    }

    public render(): React.ReactElement<{}> {
        if (!this.props.open) {
            return (<></>);
        }

        const html = { __html: this.parsedMarkdown };
        return (
            <Dialog open={true} close={this.props.closeDialog}>
                <div dangerouslySetInnerHTML={html}></div>
            </Dialog>
        );
    }
}

const mapStateToProps = (state: RootState) => {
    return {
        locale: state.i18n.locale,
        open: state.dialog.type === "about-thorium",
    };
};

const mapDispatchToProps = (dispatch: any) => {
    return {
        setLocale: (locale: string) => dispatch(setLocale(locale)),
        closeDialog: () => {
            dispatch(
                dialogActions.close(),
            );
        },
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(withTranslator(LanguageSettings));