import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { ADD_FORM_CLOSE, DELETE_PRESENT_REPO, PRESENT_REPO } from "../../../../actionStore";
import { ContextProvider } from "../../../../context";
import {
  globalAPIEndpoint,
  ROUTE_FETCH_REPO
} from "../../../../util/env_config";
import InfiniteLoader from "../../../Animations/InfiniteLoader";
import "../../../styles/RepoComponent.css";
import AddRepoFormComponent from "./AddRepoForm";
import RepoCard from "./RepoCard";

export default function RepoComponent(props) {
  const [repo, setRepo] = useState([]);
  const [repoFormEnable, setRepoFormEnable] = useState(false);
  const [loading, setLoading] = useState(false);

  const { dispatch } = useContext(ContextProvider);

  useEffect(() => {
    setLoading(true);
    const fetchRepoURL = globalAPIEndpoint;
    const token = axios.CancelToken;
    const source = token.source();

    axios({
      url: fetchRepoURL,
      method: "POST",
      cancelToken: source.token,
      data: {
        query: `
          query GitConvexResults{
            gitConvexApi(route: "${ROUTE_FETCH_REPO}"){
              fetchRepo{
                repoId
                repoName
                repoPath
              }
            }
          }
        `,
      },
    })
      .then((res) => {
        const apiResponse = res.data.data.gitConvexApi.fetchRepo;
        setLoading(false);

        if (apiResponse) {
          const { repoId, repoName } = apiResponse;
          let repoContent = [];

          repoId.forEach((entry, index) => {
            repoContent.push({ id: entry, repoName: repoName[index] });
          });

          setRepo(repoContent);

          dispatch({
            type: DELETE_PRESENT_REPO,
            payload: [],
          });

          dispatch({
            action: PRESENT_REPO,
            payload: [...repoContent],
          });
        }
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });

    return () => {
      source.cancel();
    };
  }, [repoFormEnable, dispatch]);

  const showAvailableRepo = () => {
    const repoArray = repo;

    return (
      <>
        <div className="repo-component--wrapper">
          <>
            {repoArray.length > 0 ? (
              <>
                {repoArray.map((entry) => {
                  return <RepoCard key={entry.id} repoData={entry}></RepoCard>;
                })}
                {repoArray.length % 2 !== 0 && repoArray.length !== 1 ? (
                  <div className="xl:w-1/3 lg:w-2/4 md:w-1/2 block p-6 my-6 text-center"></div>
                ) : null}
              </>
            ) : (
              <div className="repo-component--loadingview">
                {loading ? (
                  <div className="block loadingview--content">
                    <div className="flex loadingview--content">
                      <InfiniteLoader loadAnimation={loading}></InfiniteLoader>
                    </div>
                    <div>Loading available repos...</div>
                  </div>
                ) : (
                  <div>No repos present. Press + to add a new repo</div>
                )}
              </div>
            )}
          </>
        </div>
        <div className="repo-component--addrepo">
          <div
            id="addRepoButton"
            className="addrepo--button"
            onClick={() => {
              setRepoFormEnable(true);
              dispatch({ type: ADD_FORM_CLOSE, payload: false });
            }}
            onMouseEnter={(event) => {
              event.stopPropagation();
              event.preventDefault();
              document.getElementById("pop-up").classList.remove("hidden");
            }}
            onMouseLeave={(event) => {
              document.getElementById("pop-up").classList.add("hidden");
            }}
          >
            <span>+</span>
            <div
              id="pop-up"
              className="addrepo--button--tooltip hidden"
              style={{ marginTop: "-75px", width: "130px" }}
            >
              Click to add a new repo
            </div>
          </div>
        </div>
      </>
    );
  };

  const addFormRemove = (param) => {
    setRepoFormEnable(param);
  };

  return (
    <div className="repo-component">
      {!repoFormEnable ? (
        showAvailableRepo()
      ) : (
        <AddRepoFormComponent formEnable={addFormRemove}></AddRepoFormComponent>
      )}
    </div>
  );
}
