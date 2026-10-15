"use client";

import { useState } from "react";
import Link from "next/link";

export default function OnlineExamsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");

  const handleCreateExam = () => {
    alert("Create Exam clicked");
  };

  const handleClear = () => {
    setSearch("");
    setStatus("All Status");
  };

  return (
    <main className="examPage">

      {/* HEADER */}
      <div className="examHeader">
        <div>
          <div className="breadcrumb">
            <Link href="/admin">Dashboard</Link>
            <span>/</span>
            <span>Online Exams</span>
          </div>

          <h1>Online Exams</h1>
        </div>

        {/* ONLY ONE CREATE EXAM BUTTON */}
        <button
          type="button"
          className="createButton"
          onClick={handleCreateExam}
        >
          <span>+</span>
          Create Exam
        </button>
      </div>

      {/* INTRO */}
      <section className="intro">
        <div className="eyebrow">EXAMINATION MANAGEMENT</div>

        <h2>
          Online <span>Exams</span>
        </h2>

        <p>
          Create, publish and manage online examinations
          from one organized workspace.
        </p>
      </section>

      {/* STATISTICS */}
      <section className="statsGrid">

        <div className="statCard">
          <div className="statIcon purple">▣</div>

          <div>
            <small>Total Exams</small>
            <strong>0</strong>
            <em>Database records</em>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon green">✓</div>

          <div>
            <small>Active Exams</small>
            <strong>0</strong>
            <em>Currently available</em>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon blue">◆</div>

          <div>
            <small>Completed</small>
            <strong>0</strong>
            <em>Finished exams</em>
          </div>
        </div>

        <div className="statCard">
          <div className="statIcon orange">◷</div>

          <div>
            <small>Draft Exams</small>
            <strong>0</strong>
            <em>Not published</em>
          </div>
        </div>

      </section>

      {/* EXAM DIRECTORY */}
      <section className="directory">

        <div className="directoryHeader">
          <div>
            <div className="eyebrow">EXAMINATION LIBRARY</div>

            <h3>All Online Exams</h3>

            <p>
              Create, publish and manage online examinations.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="filters">

          <div className="searchBox">
            <span>⌕</span>

            <input
              type="text"
              placeholder="Search exam or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Completed</option>
            <option>Draft</option>
          </select>

          <button
            type="button"
            className="clearButton"
            onClick={handleClear}
          >
            Clear
          </button>

        </div>

        {/* TABLE */}
        <div className="examTable">

          <div className="tableHead">
            <span>EXAM</span>
            <span>SUBJECT</span>
            <span>DURATION</span>
            <span>QUESTIONS</span>
            <span>STATUS</span>
            <span>ACTION</span>
          </div>

          {/* EMPTY STATE */}
          <div className="emptyState">

            <div className="emptyIcon">
              ▣
            </div>

            <h4>No online exams found</h4>

            <p>
              Online exams will appear here when you create
              them or connect your database.
            </p>

          </div>

        </div>

      </section>

      {/* PAGE STYLES */}
      <style jsx>{`

        .examPage {
          min-height: 100vh;
          padding: 30px;
          background: #f5f6ff;
          color: #18203a;
          animation: pageIn 0.45s ease;
        }

        .examHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 32px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          font-size: 13px;
          color: #8a91aa;
        }

        .breadcrumb a {
          color: #5368ff;
          text-decoration: none;
        }

        .examHeader h1 {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
        }

        .createButton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 50px;
          padding: 0 23px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #5867ff,
            #7355ff
          );
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 12px 25px rgba(89, 94, 246, 0.22);
          transition: all 0.22s ease;
        }

        .createButton span {
          font-size: 20px;
        }

        .createButton:hover {
          transform: translateY(-3px);
          box-shadow:
            0 17px 32px rgba(89, 94, 246, 0.32);
        }

        .createButton:active {
          transform: scale(0.97);
        }

        .intro {
          margin-bottom: 28px;
        }

        .eyebrow {
          margin-bottom: 8px;
          color: #5368ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 4px;
        }

        .intro h2 {
          margin: 0;
          font-size: 40px;
          line-height: 1.15;
          letter-spacing: -1px;
        }

        .intro h2 span {
          color: #5d65f6;
        }

        .intro p {
          max-width: 650px;
          margin: 10px 0 0;
          color: #7b84a1;
          font-size: 14px;
          line-height: 1.7;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          margin-bottom: 28px;
        }

        .statCard {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 18px;
          min-height: 135px;
          padding: 24px;
          background: white;
          border: 1px solid #e2e5f0;
          border-radius: 21px;
          box-shadow:
            0 10px 28px rgba(45, 54, 100, 0.05);
          transition: all 0.25s ease;
        }

        .statCard::after {
          content: "";
          position: absolute;
          right: -35px;
          bottom: -60px;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: #f1f1ff;
        }

        .statCard:hover {
          transform: translateY(-4px);
          box-shadow:
            0 16px 35px rgba(45, 54, 100, 0.1);
        }

        .statIcon {
          position: relative;
          z-index: 1;
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          font-size: 21px;
          font-weight: 800;
        }

        .purple {
          color: #5963f5;
          background: #eeedff;
        }

        .green {
          color: #00b889;
          background: #e1f8f1;
        }

        .blue {
          color: #089dd2;
          background: #e0f5ff;
        }

        .orange {
          color: #f29a19;
          background: #fff1dc;
        }

        .statCard small,
        .statCard strong,
        .statCard em {
          position: relative;
          z-index: 1;
          display: block;
        }

        .statCard small {
          margin-bottom: 6px;
          color: #7b84a1;
          font-size: 13px;
        }

        .statCard strong {
          font-size: 27px;
          line-height: 1;
        }

        .statCard em {
          margin-top: 7px;
          color: #9ba2b8;
          font-size: 11px;
          font-style: normal;
        }

        .directory {
          overflow: hidden;
          background: white;
          border: 1px solid #e2e5f0;
          border-radius: 23px;
          box-shadow:
            0 12px 35px rgba(45, 54, 100, 0.06);
          animation: fadeUp 0.55s ease;
        }

        .directoryHeader {
          padding: 28px 30px 22px;
          border-bottom: 1px solid #edf0f6;
        }

        .directoryHeader h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
        }

        .directoryHeader p {
          margin: 7px 0 0;
          color: #8a92aa;
          font-size: 13px;
        }

        .filters {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px 30px;
          border-bottom: 1px solid #edf0f6;
        }

        .searchBox {
          height: 46px;
          flex: 1;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 14px;
          border: 1px solid #dfe3ee;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .searchBox:focus-within {
          border-color: #6871ff;
          box-shadow:
            0 0 0 4px rgba(104, 113, 255, 0.1);
        }

        .searchBox span {
          color: #8d95aa;
          font-size: 20px;
        }

        .searchBox input {
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #252d48;
          font-size: 13px;
        }

        .filters select {
          height: 46px;
          min-width: 155px;
          padding: 0 13px;
          border: 1px solid #dfe3ee;
          border-radius: 12px;
          outline: none;
          background: white;
          color: #66708d;
          cursor: pointer;
        }

        .clearButton {
          height: 46px;
          padding: 0 18px;
          border: 1px solid #dfe3ee;
          border-radius: 12px;
          background: white;
          color: #66708d;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clearButton:hover {
          border-color: #6871ff;
          color: #5360ec;
          background: #f5f6ff;
        }

        .examTable {
          width: 100%;
        }

        .tableHead {
          display: grid;
          grid-template-columns:
            1.6fr 1.2fr 1fr 1fr 1fr 0.8fr;
          min-width: 750px;
          padding: 17px 30px;
          background: #fafbfe;
          border-bottom: 1px solid #edf0f6;
          color: #8790aa;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .emptyState {
          min-height: 290px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 20px;
          text-align: center;
        }

        .emptyIcon {
          width: 62px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 17px;
          border-radius: 18px;
          background: #eeedff;
          color: #5c67ff;
          font-size: 25px;
          animation: floating 3s ease-in-out infinite;
        }

        .emptyState h4 {
          margin: 0;
          font-size: 18px;
        }

        .emptyState p {
          max-width: 400px;
          margin: 9px 0 0;
          color: #939bb0;
          font-size: 13px;
          line-height: 1.6;
        }

        @keyframes pageIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floating {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-5px);
          }
        }

        @media (max-width: 900px) {
          .examPage {
            padding: 24px;
          }

          .filters {
            flex-wrap: wrap;
          }

          .searchBox {
            flex-basis: 100%;
          }
        }

        @media (max-width: 640px) {
          .examPage {
            padding: 18px 14px 30px;
          }

          .examHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .examHeader h1 {
            font-size: 25px;
          }

          .createButton {
            width: 100%;
          }

          .intro h2 {
            font-size: 31px;
          }

          .statsGrid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .statCard {
            min-height: 110px;
            padding: 19px;
          }

          .directory {
            border-radius: 18px;
          }

          .directoryHeader {
            padding: 22px 18px;
          }

          .directoryHeader h3 {
            font-size: 20px;
          }

          .filters {
            flex-direction: column;
            align-items: stretch;
            padding: 15px 18px;
          }

          .searchBox,
          .filters select,
          .clearButton {
            width: 100%;
            flex: none;
          }

          .examTable {
            overflow-x: auto;
          }

          .emptyState {
            min-height: 250px;
          }
        }

      `}</style>
    </main>
  );
}