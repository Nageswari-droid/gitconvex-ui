import axios from "axios";
import * as Prism from "prismjs";
import React, { useEffect, useState } from "react";
import "../../../../../../prism.css";
import {
  CODE_FILE_VIEW,
  globalAPIEndpoint,
} from "../../../../../../util/env_config";

export default function CodeFileViewComponent(props) {
  const [languageState, setLanguageState] = useState("");
  const [numberOfLines, setNumberOfLines] = useState(0);
  const [latestCommit, setLatestCommit] = useState("");
  const [prismIndicator, setPrismIndicator] = useState("");
  const [highlightedCode, setHighlightedCode] = useState([]);
  const [fileDataState, setFileDataState] = useState([]);
  const [isInvalidFile, setIsInvalidFile] = useState(false);

  const repoId = props.repoId;
  const fileItem = props.fileItem;

  useEffect(() => {
    const payload = JSON.stringify(
      JSON.stringify({
        repoId: repoId,
        fileItem: fileItem,
      })
    );
    axios({
      url: globalAPIEndpoint,
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      data: {
        query: `
          query GitConvexApi{
            gitConvexApi(route: "${CODE_FILE_VIEW}", payload:${payload})
            {
              codeFileDetails{
                language
                fileCommit
                fileData
                prism
              }
            }
          }
        `,
      },
    })
      .then(async (res) => {
        if (res.data.data) {
          const {
            language,
            fileCommit,
            fileData,
            prism,
          } = res.data.data.gitConvexApi.codeFileDetails;

          if (fileData.length === 0) {
            setIsInvalidFile(true);
          }

          setLanguageState(language);
          setLatestCommit(fileCommit);
          setNumberOfLines(fileData.length);
          setFileDataState(fileData);

          if (prism) {
            await import("prismjs/components/prism-" + prism + ".js")
              .then(() => {
                setPrismIndicator(prism);
                const codeHighlight = fileData.map((line) => {
                  return Prism.highlight(line, Prism.languages[prism], prism);
                });
                setHighlightedCode([...codeHighlight]);
              })
              .catch((err) => {
                console.log(err);
                setPrismIndicator("markdown");
              });
          }
        }
      })
      .catch((err) => {
        setIsInvalidFile(true);
      });
  }, [repoId, fileItem]);

  function topPanePills(label, content, accent) {
    const bg = `bg-${accent}-100`;
    const textColor = `text-${accent}-500`;

    return (
      <div className="flex justify-between w-1/2 gap-10 items-center align-middle">
        <div className="text-center w-1/4 font-light font-sans text-xl border-b-4 border-dashed text-gray-700">
          {label}
        </div>
        <div
          className={`"w-11/12 mx-auto rounded p-2 text-center ${bg} ${textColor} ${
            content.length > 10 ? "text-sm" : ""
          } font-semibold"`}
        >
          {content}
        </div>
      </div>
    );
  }

  function invalidFileAlert() {
    return (
      <div className="w-3/4 mx-auto my-auto p-6 rounded bg-red-200 text-red-600 font-sans text-2xl font-light text-center border-b-8 border-red-400 border-dashed">
        {languageState || isInvalidFile
          ? "File cannot be opened!"
          : "Loading..."}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-md shadow-sm flex justify-center mx-auto my-auto mb-6 w-full h-full">
      {isInvalidFile ? (
        invalidFileAlert()
      ) : (
        <div className="mx-auto mb-4 w-11/12 h-auto p-6">
          <div className="bg-white p-4 rounded-lg shadow block">
            <div className="flex w-11/12 mx-auto justify-between gap-4">
              {languageState
                ? topPanePills("Language", languageState, "pink")
                : null}
              {numberOfLines
                ? topPanePills("Lines", numberOfLines, "orange")
                : null}
            </div>
            {latestCommit ? (
              <div className="block mx-auto my-10 w-11/12">
                <div className="flex gap-8 items-center align-middle">
                  <div className="text-center w-1/6 font-light font-sans text-xl border-b-4 border-dashed text-gray-700">
                    Latest Commit
                  </div>
                  <div className="w-full mx-auto rounded p-2 text-center bg-indigo-100 text-indigo-500 text-sm font-semibold">
                    {latestCommit}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {fileDataState && prismIndicator ? (
            <div className="mt-10 mb-10 my-auto mx-auto bg-gray-100 mx-auto p-10 rounded shadow overflow-auto">
              <pre className="px-10 py-10 border rounded overflow-x-auto shadow bg-gray-900 text-gray-300 selection:bg-gray-500">
                <code
                  dangerouslySetInnerHTML={{
                    __html: highlightedCode.join("\n"),
                  }}
                ></code>
              </pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}