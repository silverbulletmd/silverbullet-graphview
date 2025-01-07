import { Tag } from "model";
import { space, system } from "@silverbulletmd/silverbullet/syscalls";
import { readGraphviewSettings } from "utils";
import { PageMeta } from "@silverbulletmd/silverbullet/types";

export class ColorMap {
  page: string;
  color: string;

  constructor(page: string, color: string) {
    this.page = page;
    this.color = color;
  }
}

export class ColorMapBuilder {
  colorMapSettings: any;
  colorMapPathSettings: any;
  colorMapTagSettings: any;
  spacetags: Tag[];
  spacepages: PageMeta[]
  taggedPages: string[];
  individuallyTaggedPages: any;
  default_color: any;
  builtin_default_color: any;

  async init(darkmode: bool): Promise<void> {
    // Read settings
    this.colorMapSettings = await readGraphviewSettings("colormap");
    console.log(this.colorMapSettings);
    this.colorMapPathSettings = this.colorMapSettings ? this.colorMapSettings["path"] : [];
    this.colorMapTagSettings = this.colorMapSettings ? this.colorMapSettings["tag"] : [];

    // Get all tags
    this.spacetags = await system.invokeFunction("index.queryObjects", "tag");
    this.taggedPages = [...new Set(this.spacetags.map((tag) => tag.page))];
    this.individuallyTaggedPages = await system.invokeFunction("index.queryObjects", "tag", {
      filter: ["=~", ["attr", "name"], ["string", "^nodecolor*"]],
    });

    // Get all pages
    this.spacepages = await space.listPages();

    // Get default color
    this.default_color = await readGraphviewSettings("default_color");

    // Set builtin default color
    this.builtin_default_color = darkmode ? "bfbfbf" : "000000";
  }

  build(): ColorMap[] {
    // Iterate over all pages
    return this.spacepages.map((page) => {
      // Get all tags of page
      const pageTags = this.spacetags.filter((tag) => tag.page === page.name);

      // If page has tag with "tag:node_color=" → use color from tag and continue
      if (this.individuallyTaggedPages.find((t) => t.page === page.name)) {
        return { "page": page.name, "color": this.individuallyTaggedPages.find((t) => t.page === page.name).name.split("=")[1] };
      }

      // If page has a tag from colorMapSettings ["tag"] →  map color code to page name and continue
      if (this.colorMapTagSettings) {
        // check, if any of the tags is in colorMapSettings
        const pageTagsInColorMapSettings = pageTags.filter((tag) =>
          this.colorMapTagSettings.hasOwnProperty(tag.name),
        );
        // if yes, use color from colorMapSettings
        if (pageTagsInColorMapSettings.length > 0) {
          return { "page": page.name, "color": this.colorMapTagSettings[pageTagsInColorMapSettings[0].name] };
        }
      }

      // If page name begins with element colorMapSettings ["path"] → map color code to page name and continue
      if (this.colorMapPathSettings) {
        // console.log(Object.keys(this.colorMapPathSettings))
        const pageNameBeginsWithPath = Object.keys(this.colorMapPathSettings)
          .find((path: string) => page.name.startsWith(path));
        if (pageNameBeginsWithPath) {
          return { "page": page.name, "color": this.colorMapPathSettings[pageNameBeginsWithPath] };
        }
      }

      // Use default color
      return { "page": page.name, "color": this.default_color ? this.default_color : this.builtin_default_color };
    });
  }
}
