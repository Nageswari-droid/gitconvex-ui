import axios from "axios";
import Prism from "prismjs";
import React, { useContext, useEffect, useState } from "react";
import { GIT_TRACKED_FILES } from "../../../../actionStore";
import { ContextProvider } from "../../../../context";
import {
  globalAPIEndpoint,
  ROUTE_REPO_FILE_DIFF,
  ROUTE_REPO_TRACKED_DIFF,
} from "../../../../util/env_config";

import { v4 as uuidv4 } from "uuid";

export default function GitDiffViewComponent() {
  const { state, dispatch } = useContext(ContextProvider);
  const repoId = state.globalRepoId;

  const [changedFiles, setChangedFiles] = useState([]);
  const [diffStatState, setDiffStatState] = useState(
    "Click on a file item to see the difference"
  );
  const [fileLineDiffState, setFileLineDiffState] = useState([]);
  const [activeFileName, setActiveFileName] = useState("");
  const [isApiCalled, setIsApiCalled] = useState(false)

  useEffect(() => {
    setActiveFileName("");
    setFileLineDiffState("Click on a file item to see the difference");
    setDiffStatState("Click on a file item to see the difference");
    let apiEndPoint = globalAPIEndpoint;
    if (repoId) {
      const payload = JSON.stringify(JSON.stringify({ repoId: repoId }));

      axios({
        url: apiEndPoint,
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        data: {
          query: `
            query GitConvexApi{
              gitConvexApi(route: "${ROUTE_REPO_TRACKED_DIFF}", payload:${payload})
              {
                gitChanges{
                  gitChangedFiles
                }
              }
            }
          `,
        },
      })
        .then((res) => {
          if (res) {
            var apiData = res.data.data.gitConvexApi.gitChanges;
            const { gitChangedFiles } = apiData;
            setChangedFiles([...gitChangedFiles]);
            setIsApiCalled(true)
            dispatch({ type: GIT_TRACKED_FILES, payload: gitChangedFiles });
          }
        })
        .catch((err) => {
          return err;
        });
    }
  }, [state.globalRepoId]);

  function getDiffFiles() {
    return (
      <>
        {changedFiles.length >= 1 && changedFiles.map((entry) => {
          if (entry && entry.split(",")[0] === "M") {
            let fileEntry = entry.split(",")[1];
            const styleSelector = " bg-indigo-100 border-b border-indigo-400";
            return (
              <div
                className={`p-2 text-sm break-words hover:bg-indigo-100 cursor-pointer ${
                  fileEntry === activeFileName ? styleSelector : ""
                  }`}
                onClick={() => {
                  setActiveFileName(fileEntry);
                  fileDiffStatComponent(repoId, fileEntry);
                }}
                key={fileEntry}
              >
                {fileEntry}
              </div>
            );
          } else {
            return null;
          }
        })}
      </>
    );
  }
  function fileDiffStatComponent(repoId, fileName) {
    const apiEndPoint = globalAPIEndpoint;

    const payload = JSON.stringify(
      JSON.stringify({ repoId: repoId, fileName: fileName })
    );

    axios({
      url: apiEndPoint,
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      data: {
        query: `
          query GitConvexApi{
            gitConvexApi(route: "${ROUTE_REPO_FILE_DIFF}", payload:${payload})
            {
              gitFileLineChanges{
                diffStat
                fileDiff
              }
            }
          }
        `,
      },
    })
      .then((res) => {
        const {
          diffStat,
          fileDiff,
        } = res.data.data.gitConvexApi.gitFileLineChanges;

        setDiffStatState(diffStat[1]);
        setFileLineDiffState(fileDiff);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function statFormat() {
    if (diffStatState && diffStatState.includes(",")) {
      let splitStat = diffStatState.split(",");

      return (
        <div className="text-xl text-center w-3/4 mx-auto block p-2 border border-gray-500 rounded-md shadow-md border-dotted">
          <span className="font-sans font-bold px-1">{splitStat[0]}</span>
          {splitStat.slice(1, splitStat.length).map((parts) => {
            if (parts.match(/insert/i)) {
              return (
                <span key={`${parts}-${new Date().getTime()}`}>
                  <span className="px-2">{parts.toString().split(" ")[1]}</span>
                  <span className="text-green-700 font-sans font-semibold">
                    {" "}
                    insertions (+)
                  </span>
                </span>
              );
            } else {
              return (
                <span key={`${parts}-${new Date().getTime()}`}>
                  <span className="px-2">{parts.toString().split(" ")[1]}</span>
                  <span className="text-red-700 font-sans font-semibold">
                    {" "}
                    deletions (+)
                  </span>
                </span>
              );
            }
          })}
        </div>
      );
    }
  }

  function fileLineDiffComponent() {
    let splitLines = [];
    if (fileLineDiffState) {
      let partFile = fileLineDiffState
        .join("|__HASH_SEPARATOR__|")
        .split(/@@.*@@/gi)[1]
        .split("|__HASH_SEPARATOR__|");

      splitLines = partFile.map((line) => {
        if (line[0] === "+") {
          return (
            <div className="bg-green-200 w-screen" key={`${line}-${uuidv4()}`}>
              <pre>
                <code
                  dangerouslySetInnerHTML={{
                    __html: Prism.highlight(
                      line.replace("+", ""),
                      Prism.languages.javascript,
                      "javascript"
                    ),
                  }}
                ></code>
              </pre>
            </div>
          );
        } else if (line[0] === "-") {
          return (
            <div className="bg-red-200 w-screen" key={`${line}-${uuidv4()}`}>
              <pre>
                <pre>
                  <code
                    dangerouslySetInnerHTML={{
                      __html: Prism.highlight(
                        line.replace("-", ""),
                        Prism.languages.javascript,
                        "javascript"
                      ),
                    }}
                  ></code>
                </pre>
              </pre>
            </div>
          );
        } else {
          return (
            <div className="bg-white-200 w-screen" key={`${line}-${uuidv4()}`}>
              <pre>
                <code
                  dangerouslySetInnerHTML={{
                    __html: Prism.highlight(
                      line,
                      Prism.languages.javascript,
                      "javascript"
                    ),
                  }}
                ></code>
              </pre>
            </div>
          );
        }
      });
    }

    return <div className="break-all my-6 mx-auto">{splitLines}</div>;
  }

  return (
    <>
      {

        changedFiles && changedFiles.length > 0 ?
          <>
            <div className="flex mx-auto w-full justify-center">

              <div className="break-words p-2 py-2 bg-indigo-200 text-indigo-800 w-1/4 overflow-hidden">
                {getDiffFiles()}
              </div>

              {!activeFileName ? (
                <div className="p-3 shadow-md rounded-sm text-center mx-auto my-auto mt-3 block text-md font-sans">
                  Click on a file to see difference information
                </div>
              ) : (
                  ""
                )}

              {diffStatState &&
                diffStatState !== "Click on a file item to see the difference" ? (
                  <div className="p-2 break-all w-3/4 mx-auto">
                    {diffStatState ? statFormat() : ""}
                    {fileLineDiffState &&
                      fileLineDiffState !== "Click on a file item to see the difference" ? (
                        <div className="p-2 py-6 mt-6 text-left break-words overflow-scroll">
                          {fileLineDiffComponent()}
                        </div>
                      ) : (
                        ""
                      )}
                  </div>
                ) : (
                  ""
                )}
            </div>
          </>
          :
          <>
            {
              isApiCalled ?
                <div className="my-3 mx-auto text-center p-3 rounded-md shadow-md bg-pink-200 text-gray-700">
                  <span>No Changed files are being tracked currently!</span>
                </div>
                :
                null
            }
          </>
      }
    </>

  );
}