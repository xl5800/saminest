// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

const legacyPath = resolve(process.cwd(), "public/legacy-app.js");
const legacySource = readFileSync(legacyPath, "utf8");

function sourceBetween(startMarker, endMarker) {
  const start = legacySource.indexOf(startMarker);
  const end = legacySource.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Missing legacy source markers: ${startMarker}`);
  }
  return legacySource.slice(start, end);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function createDocument(markup) {
  const testDocument = document.implementation.createHTMLDocument("publish");
  testDocument.body.innerHTML = markup;
  return testDocument;
}

function installSubmitHarness(testDocument, submitListing) {
  const helperSource = sourceBetween(
    "function listingSubmitButtons",
    "function showAppNotice"
  );
  const helpers = new Function(
    "document",
    `${helperSource}\nreturn { listingSubmitButtons, setListingSubmitting };`
  )(testDocument);

  const submitListenerSource = sourceBetween(
    'document.addEventListener("submit"',
    'document.addEventListener("click"'
  );
  new Function(
    "document",
    "validateListingForm",
    "setListingSubmitting",
    "submitListing",
    "showAppNotice",
    "authErrorMessage",
    "console",
    submitListenerSource
  )(
    testDocument,
    () => true,
    helpers.setListingSubmitting,
    submitListing,
    vi.fn(),
    (error) => String(error),
    { error: vi.fn() }
  );

  return helpers;
}

function publishMarkup() {
  return `
    <button type="submit" form="publish-form" data-publish-submit>顶部发布</button>
    <form id="publish-form" data-listing-form="rent">
      <input name="title" value="测试帖子" />
      <button type="submit" data-publish-submit>底部发布</button>
    </form>
  `;
}

describe("Legacy publish adapter and submit guard", () => {
  it("keeps the three legacy publish functions as TypeScript bridge adapters", () => {
    const mapper = sourceBetween(
      "function uiListingToDb",
      "async function fetchProfilesMap"
    );
    const imageWriter = sourceBetween(
      "async function saveListingImagesToSupabase",
      "async function uploadListingImagesToSupabase"
    );
    const submit = sourceBetween(
      "async function submitListing",
      "function saveDraft"
    );

    expect(mapper).toContain("publishModule().mappers.uiListingToDb(");
    expect(imageWriter).toContain("service.saveListingImages(");
    expect(submit).toContain("module.service.publish(collected.request)");
    expect(submit).toContain("collectPublishRequest(form, type)");
    expect(submit).toContain("applyPublishOutcome(result.data");
    expect(submit).not.toContain('supabaseClient.from("listings")');
    expect(submit).not.toContain('supabaseClient.from("listing_images")');
    expect(imageWriter).not.toContain('supabaseClient.from("listing_images")');
  });

  it("keeps one delegated submit listener and locks before awaiting publish", () => {
    expect(
      legacySource.match(/document\.addEventListener\("submit"/g) || []
    ).toHaveLength(1);

    const listener = sourceBetween(
      'document.addEventListener("submit"',
      'document.addEventListener("click"'
    );
    expect(listener).toContain('listingForm.dataset.submitting === "true"');
    expect(listener.indexOf("setListingSubmitting(listingForm, true)"))
      .toBeLessThan(listener.indexOf("await submitListing("));
    expect(listener).toContain("finally");
    expect(listener).toContain("setListingSubmitting(listingForm, false)");
  });

  it("associates the top and bottom buttons with the same form", () => {
    const testDocument = createDocument(publishMarkup());
    const helpers = installSubmitHarness(testDocument, vi.fn());
    const form = testDocument.querySelector("form");

    expect(helpers.listingSubmitButtons(form)).toHaveLength(2);
    expect(helpers.listingSubmitButtons(form).every((button) => button.form === form))
      .toBe(true);
  });

  it("allows only one pending publish across rapid top and bottom clicks", async () => {
    const testDocument = createDocument(publishMarkup());
    const pending = deferred();
    const submitListing = vi.fn(() => pending.promise);
    installSubmitHarness(testDocument, submitListing);
    const form = testDocument.querySelector("form");
    const [topButton, bottomButton] = testDocument.querySelectorAll(
      "[data-publish-submit]"
    );

    topButton.click();
    bottomButton.click();

    expect(submitListing).toHaveBeenCalledOnce();
    expect(form.dataset.submitting).toBe("true");
    expect(topButton.disabled).toBe(true);
    expect(bottomButton.disabled).toBe(true);

    pending.resolve(true);
    await vi.waitFor(() => expect(form.dataset.submitting).toBe("false"));
    expect(topButton.disabled).toBe(false);
    expect(bottomButton.disabled).toBe(false);
    expect(topButton.textContent).toBe("顶部发布");
    expect(bottomButton.textContent).toBe("底部发布");
  });

  it("deduplicates repeated requestSubmit calls and restores buttons on failure", async () => {
    const testDocument = createDocument(publishMarkup());
    const pending = deferred();
    const submitListing = vi.fn(() => pending.promise);
    installSubmitHarness(testDocument, submitListing);
    const form = testDocument.querySelector("form");
    const [topButton, bottomButton] = testDocument.querySelectorAll(
      "[data-publish-submit]"
    );

    form.requestSubmit(topButton);
    form.requestSubmit(bottomButton);
    expect(submitListing).toHaveBeenCalledOnce();

    pending.reject(new Error("publish failed"));
    await vi.waitFor(() => expect(form.dataset.submitting).toBe("false"));
    expect(topButton.disabled).toBe(false);
    expect(bottomButton.disabled).toBe(false);
  });

  it("preserves the current Enter-key rule for ordinary inputs", () => {
    const testDocument = createDocument(`
      <form data-listing-form="rent">
        <input name="title" />
        <textarea name="desc"></textarea>
      </form>
    `);
    const keydownSource = sourceBetween(
      'document.addEventListener("keydown"',
      'document.addEventListener("submit"'
    );
    new Function("document", keydownSource)(testDocument);

    const inputEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });
    const textareaEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });
    testDocument.querySelector("input").dispatchEvent(inputEvent);
    testDocument.querySelector("textarea").dispatchEvent(textareaEvent);

    expect(inputEvent.defaultPrevented).toBe(true);
    expect(textareaEvent.defaultPrevented).toBe(false);
  });
});
